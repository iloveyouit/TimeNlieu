import { db } from "@/db";
import {
  config,
  lieuLedger,
  projectTasks,
  projects,
  roles,
  timesheetEntries,
} from "@/db/schema";
import { and, asc, eq, gte, lt } from "drizzle-orm";

const DAY_MS = 24 * 60 * 60 * 1000;

export function toUtcStartOfDay(dateMs: number) {
  const date = new Date(dateMs);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function startOfWeekUtc(dateMs: number) {
  const date = new Date(toUtcStartOfDay(dateMs));
  const day = date.getUTCDay(); // 0 = Sunday
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() - day
  );
}

export function weekRangeUtc(weekStartDateMs: number) {
  const start = toUtcStartOfDay(weekStartDateMs);
  const end = start + 7 * DAY_MS;
  return { start, end };
}

export async function getWeeklyThreshold() {
  const [row] = await db
    .select()
    .from(config)
    .where(eq(config.key, "weekly_threshold_hours"))
    .limit(1);
  return row?.value ?? 40;
}

export async function getWeekDataForUser(userId: string, weekStartDateMs: number) {
  const { start, end } = weekRangeUtc(weekStartDateMs);

  const [entries, projectsList, tasksList, rolesList, threshold] =
    await Promise.all([
      db
        .select()
        .from(timesheetEntries)
        .where(
          and(
            eq(timesheetEntries.userId, userId),
            gte(timesheetEntries.date, start),
            lt(timesheetEntries.date, end)
          )
        ),
      db.select().from(projects).orderBy(asc(projects.name)),
      db.select().from(projectTasks).orderBy(asc(projectTasks.name)),
      db.select().from(roles).orderBy(asc(roles.name)),
      getWeeklyThreshold(),
    ]);

  return {
    weekStartDate: start,
    weekEndDate: start + 6 * DAY_MS,
    threshold,
    entries,
    projects: projectsList,
    projectTasks: tasksList,
    roles: rolesList,
  };
}

export async function recalculateLieuLedgerForUser(userId: string) {
  const threshold = await getWeeklyThreshold();
  const entries = await db
    .select({
      date: timesheetEntries.date,
      hours: timesheetEntries.hours,
    })
    .from(timesheetEntries)
    .where(eq(timesheetEntries.userId, userId));

  const totals = new Map<number, number>();
  for (const entry of entries) {
    const weekStart = startOfWeekUtc(entry.date);
    totals.set(weekStart, (totals.get(weekStart) ?? 0) + entry.hours);
  }

  const weeks = Array.from(totals.entries())
    .map(([weekStartDate, totalHours]) => ({ weekStartDate, totalHours }))
    .sort((a, b) => a.weekStartDate - b.weekStartDate);

  let runningBalance = 0;
  const rows = weeks.map((week) => {
    const overtimeHours = Math.max(0, week.totalHours - threshold);
    const lieuEarned = overtimeHours;
    runningBalance += lieuEarned;
    return {
      id: `${userId}-${week.weekStartDate}`,
      userId,
      weekStartDate: week.weekStartDate,
      totalHours: Number(week.totalHours.toFixed(2)),
      overtimeHours: Number(overtimeHours.toFixed(2)),
      lieuEarned: Number(lieuEarned.toFixed(2)),
      runningBalance: Number(runningBalance.toFixed(2)),
    };
  });

  await db.transaction(async (tx) => {
    await tx.delete(lieuLedger).where(eq(lieuLedger.userId, userId));
    if (rows.length > 0) {
      await tx.insert(lieuLedger).values(rows);
    }
  });
}
