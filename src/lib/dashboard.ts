import { db } from "@/db";
import { lieuLedger, projects, timesheetEntries } from "@/db/schema";
import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import {
  getWeeklyThreshold,
  startOfWeekUtc,
  weekRangeUtc,
} from "@/lib/timesheet";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type ProjectRow = { id: string; name: string; code: string };

const toLabel = (project: ProjectRow | undefined) =>
  project ? `${project.code} — ${project.name}` : "Unassigned";

export async function getDashboardData(userId: string) {
  const now = Date.now();
  const currentWeekStart = startOfWeekUtc(now);
  const { start: weekStart, end: weekEnd } = weekRangeUtc(currentWeekStart);
  const threshold = await getWeeklyThreshold();

  const [entriesFourWeeks, entriesTrend, projectsList, ledgerRows] =
    await Promise.all([
      db
        .select({
          date: timesheetEntries.date,
          hours: timesheetEntries.hours,
          projectId: timesheetEntries.projectId,
        })
        .from(timesheetEntries)
        .where(
          and(
            eq(timesheetEntries.userId, userId),
            gte(
              timesheetEntries.date,
              new Date(currentWeekStart - 3 * WEEK_MS),
            ),
            lt(timesheetEntries.date, new Date(weekEnd)),
          ),
        ),
      db
        .select({
          date: timesheetEntries.date,
          hours: timesheetEntries.hours,
        })
        .from(timesheetEntries)
        .where(
          and(
            eq(timesheetEntries.userId, userId),
            gte(
              timesheetEntries.date,
              new Date(currentWeekStart - 11 * WEEK_MS),
            ),
            lt(timesheetEntries.date, new Date(weekEnd)),
          ),
        ),
      db
        .select({ id: projects.id, name: projects.name, code: projects.code })
        .from(projects)
        .orderBy(asc(projects.name)),
      db
        .select()
        .from(lieuLedger)
        .where(eq(lieuLedger.userId, userId))
        .orderBy(desc(lieuLedger.weekStartDate))
        .limit(2),
    ]);

  const projectMap = new Map(projectsList.map((p) => [p.id, p]));

  const thisWeekTotal = entriesFourWeeks
    .filter((entry) => entry.date.getTime() >= weekStart && entry.date.getTime() < weekEnd)
    .reduce((sum, entry) => sum + entry.hours, 0);

  const thisWeekOvertime = Math.max(0, thisWeekTotal - threshold);

  const projectHoursWeek = new Map<string, number>();
  const projectHoursFourWeeks = new Map<string, number>();

  for (const entry of entriesFourWeeks) {
    const key = entry.projectId ?? "unassigned";
    projectHoursFourWeeks.set(
      key,
      (projectHoursFourWeeks.get(key) ?? 0) + entry.hours,
    );
    if (entry.date.getTime() >= weekStart && entry.date.getTime() < weekEnd) {
      projectHoursWeek.set(key, (projectHoursWeek.get(key) ?? 0) + entry.hours);
    }
  }

  const hoursByProjectWeek = Array.from(projectHoursWeek.entries())
    .map(([projectId, hours]) => {
      const project =
        projectId === "unassigned" ? undefined : projectMap.get(projectId);
      return {
        name: toLabel(project),
        hours: Number(hours.toFixed(2)),
      };
    })
    .sort((a, b) => b.hours - a.hours);

  const hoursByProjectFourWeeks = Array.from(projectHoursFourWeeks.entries())
    .map(([projectId, hours]) => {
      const project =
        projectId === "unassigned" ? undefined : projectMap.get(projectId);
      return {
        name: toLabel(project),
        hours: Number(hours.toFixed(2)),
      };
    })
    .sort((a, b) => b.hours - a.hours);

  const trendTotals = new Map<number, number>();
  for (const entry of entriesTrend) {
    const weekStart = startOfWeekUtc(entry.date.getTime());
    trendTotals.set(weekStart, (trendTotals.get(weekStart) ?? 0) + entry.hours);
  }

  const weeklyTrend = Array.from({ length: 12 }, (_, idx) => {
    const weekStartDate = currentWeekStart - (11 - idx) * WEEK_MS;
    return {
      weekStartDate,
      totalHours: Number((trendTotals.get(weekStartDate) ?? 0).toFixed(2)),
    };
  });

  const runningBalance = ledgerRows[0]?.runningBalance ?? 0;
  const previousBalance = ledgerRows[1]?.runningBalance ?? runningBalance;
  const balanceChange = Number((runningBalance - previousBalance).toFixed(2));

  return {
    threshold,
    runningBalance: Number(runningBalance.toFixed(2)),
    balanceChange,
    thisWeekTotal: Number(thisWeekTotal.toFixed(2)),
    thisWeekOvertime: Number(thisWeekOvertime.toFixed(2)),
    hoursByProjectWeek,
    hoursByProjectFourWeeks,
    weeklyTrend,
  };
}
