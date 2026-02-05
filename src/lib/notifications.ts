import crypto from "crypto";
import { db } from "@/db";
import { config, notifications, timesheetEntries } from "@/db/schema";
import { and, eq, gte, lt } from "drizzle-orm";
import { startOfWeekUtc, weekRangeUtc } from "@/lib/timesheet";

const DAY_MS = 24 * 60 * 60 * 1000;

type NotificationConfig = {
  reminderDay: number;
  reminderHour: number;
};

async function getNotificationConfig(): Promise<NotificationConfig> {
  const rows = await db
    .select()
    .from(config)
    .where(eq(config.key, "notifications_weekly_reminder_day"))
    .limit(1);
  const [hourRow] = await db
    .select()
    .from(config)
    .where(eq(config.key, "notifications_weekly_reminder_hour"))
    .limit(1);

  return {
    reminderDay: rows[0]?.value ?? 5,
    reminderHour: hourRow?.value ?? 16,
  };
}

function shouldSendReminder(now: Date, config: NotificationConfig) {
  return now.getUTCDay() === config.reminderDay && now.getUTCHours() >= config.reminderHour;
}

async function hasNotification(userId: string, type: string, key: string) {
  const existing = await db
    .select({ id: notifications.id, metadata: notifications.metadata })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.type, type)));
  return existing.some((row) => (row.metadata as Record<string, unknown> | null)?.key === key);
}

export async function generateNotificationsForUser(userId: string, now = new Date()) {
  const config = await getNotificationConfig();
  const currentWeekStart = startOfWeekUtc(now.getTime());
  const previousWeekStart = currentWeekStart - 7 * DAY_MS;
  const previousWeekRange = weekRangeUtc(previousWeekStart);
  const currentWeekRange = weekRangeUtc(currentWeekStart);

  if (shouldSendReminder(now, config)) {
    const entries = await db
      .select({ hours: timesheetEntries.hours, status: timesheetEntries.status })
      .from(timesheetEntries)
      .where(
        and(
          eq(timesheetEntries.userId, userId),
          gte(timesheetEntries.date, new Date(currentWeekRange.start)),
          lt(timesheetEntries.date, new Date(currentWeekRange.end))
        )
      );
    const hasDraft = entries.some((entry) => entry.status === "Draft");
    if (entries.length === 0 || hasDraft) {
      const key = `weekly-reminder-${currentWeekStart}`;
      if (!(await hasNotification(userId, "weekly-reminder", key))) {
        await db.insert(notifications).values({
          id: crypto.randomUUID(),
          userId,
          type: "weekly-reminder",
          title: "Weekly timesheet reminder",
          message: entries.length === 0
            ? "You have not logged any hours this week."
            : "You have Draft entries that need submission.",
          isRead: false,
          createdAt: new Date(),
          metadata: { key, weekStartDate: currentWeekStart },
        });
      }
    }
  }

  // Anomaly: day over 12 hours in last 14 days
  const anomalyStart = now.getTime() - 14 * DAY_MS;
  const anomalyEntries = await db
    .select({ date: timesheetEntries.date, hours: timesheetEntries.hours })
    .from(timesheetEntries)
    .where(
      and(
        eq(timesheetEntries.userId, userId),
        gte(timesheetEntries.date, new Date(anomalyStart)),
        lt(timesheetEntries.date, now)
      )
    );
  const dayTotals = new Map<number, number>();
  for (const entry of anomalyEntries) {
    const dayStart = Date.UTC(
      new Date(entry.date).getUTCFullYear(),
      new Date(entry.date).getUTCMonth(),
      new Date(entry.date).getUTCDate()
    );
    dayTotals.set(dayStart, (dayTotals.get(dayStart) ?? 0) + entry.hours);
  }
  for (const [dayStart, total] of dayTotals.entries()) {
    if (total > 12) {
      const key = `anomaly-day-${dayStart}`;
      if (!(await hasNotification(userId, "anomaly", key))) {
        await db.insert(notifications).values({
          id: crypto.randomUUID(),
          userId,
          type: "anomaly",
          title: "Unusually long day logged",
          message: `You logged ${total.toFixed(2)} hours on ${new Date(dayStart).toLocaleDateString("en-US")}.`,
          isRead: false,
          createdAt: new Date(),
          metadata: { key, dayStart },
        });
      }
    }
  }

  // Anomaly: previous week with zero hours
  const prevWeekEntries = await db
    .select({ hours: timesheetEntries.hours })
    .from(timesheetEntries)
    .where(
      and(
        eq(timesheetEntries.userId, userId),
        gte(timesheetEntries.date, new Date(previousWeekRange.start)),
        lt(timesheetEntries.date, new Date(previousWeekRange.end))
      )
    );
  const prevTotal = prevWeekEntries.reduce((sum, entry) => sum + entry.hours, 0);
  if (prevTotal === 0) {
    const key = `zero-week-${previousWeekStart}`;
    if (!(await hasNotification(userId, "anomaly", key))) {
      await db.insert(notifications).values({
        id: crypto.randomUUID(),
        userId,
        type: "anomaly",
        title: "No hours logged last week",
        message: "You logged zero hours in the previous week.",
        isRead: false,
        createdAt: new Date(),
        metadata: { key, weekStartDate: previousWeekStart },
      });
    }
  }
}
