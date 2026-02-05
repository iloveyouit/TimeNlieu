import { db } from "@/db";
import { projectTasks, projects, roles, timesheetEntries } from "@/db/schema";
import { and, asc, eq, gte, lt } from "drizzle-orm";
import { getWeeklyThreshold, startOfWeekUtc } from "@/lib/timesheet";

const DAY_MS = 24 * 60 * 60 * 1000;

export type ReportFilters = {
  startDate: number;
  endDate: number;
  status: "All" | "Draft" | "Submitted" | "Approved" | "Recalled";
  projectId: string | "All";
};

export type WeeklyRow = {
  weekStartDate: number;
  projectName: string;
  taskName: string;
  roleName: string;
  entryType: string;
  sun: number;
  mon: number;
  tue: number;
  wed: number;
  thu: number;
  fri: number;
  sat: number;
  total: number;
};

export async function getReportDataForUser(
  userId: string,
  filters: ReportFilters
) {
  const threshold = await getWeeklyThreshold();
  const { startDate, endDate, status, projectId } = filters;

  const where = [
    eq(timesheetEntries.userId, userId),
    gte(timesheetEntries.date, startDate),
    lt(timesheetEntries.date, endDate),
  ];
  if (status !== "All") {
    where.push(eq(timesheetEntries.status, status));
  }
  if (projectId !== "All") {
    where.push(eq(timesheetEntries.projectId, projectId));
  }

  const [entries, projectsList, tasksList, rolesList] = await Promise.all([
    db.select().from(timesheetEntries).where(and(...where)),
    db.select().from(projects).orderBy(asc(projects.name)),
    db.select().from(projectTasks).orderBy(asc(projectTasks.name)),
    db.select().from(roles).orderBy(asc(roles.name)),
  ]);

  const projectMap = new Map(projectsList.map((p) => [p.id, p]));
  const taskMap = new Map(tasksList.map((t) => [t.id, t]));
  const roleMap = new Map(rolesList.map((r) => [r.id, r]));

  const weeklyTotals = new Map<number, number>();
  const monthlyTotals = new Map<string, number>();

  const rowMap = new Map<string, WeeklyRow>();

  for (const entry of entries) {
    const weekStart = startOfWeekUtc(entry.date);
    weeklyTotals.set(weekStart, (weeklyTotals.get(weekStart) ?? 0) + entry.hours);

    const date = new Date(entry.date);
    const monthKey = `${date.getUTCFullYear()}-${String(
      date.getUTCMonth() + 1
    ).padStart(2, "0")}`;
    monthlyTotals.set(monthKey, (monthlyTotals.get(monthKey) ?? 0) + entry.hours);

    const project = entry.projectId ? projectMap.get(entry.projectId) : null;
    const task = entry.taskId ? taskMap.get(entry.taskId) : null;
    const role = entry.roleId ? roleMap.get(entry.roleId) : null;
    const rowKey = [
      weekStart,
      entry.projectId ?? "null",
      entry.taskId ?? "null",
      entry.roleId ?? "null",
      entry.entryType ?? "Work",
    ].join("|");

    if (!rowMap.has(rowKey)) {
      rowMap.set(rowKey, {
        weekStartDate: weekStart,
        projectName: project ? `${project.code} — ${project.name}` : "Unassigned",
        taskName: task ? `${task.code ? `${task.code} — ` : ""}${task.name}` : "Unassigned",
        roleName: role ? role.name : "Unassigned",
        entryType: entry.entryType ?? "Work",
        sun: 0,
        mon: 0,
        tue: 0,
        wed: 0,
        thu: 0,
        fri: 0,
        sat: 0,
        total: 0,
      });
    }

    const row = rowMap.get(rowKey)!;
    const dayIndex = new Date(entry.date).getUTCDay();
    const value = Number(entry.hours.toFixed(2));
    if (dayIndex === 0) row.sun += value;
    if (dayIndex === 1) row.mon += value;
    if (dayIndex === 2) row.tue += value;
    if (dayIndex === 3) row.wed += value;
    if (dayIndex === 4) row.thu += value;
    if (dayIndex === 5) row.fri += value;
    if (dayIndex === 6) row.sat += value;
    row.total += value;
  }

  const weeklySummary = Array.from(weeklyTotals.entries())
    .map(([weekStartDate, totalHours]) => {
      const overtimeHours = Math.max(0, totalHours - threshold);
      return {
        weekStartDate,
        weekEndDate: weekStartDate + 6 * DAY_MS,
        totalHours: Number(totalHours.toFixed(2)),
        overtimeHours: Number(overtimeHours.toFixed(2)),
      };
    })
    .sort((a, b) => a.weekStartDate - b.weekStartDate);

  const monthlySummary = Array.from(monthlyTotals.entries())
    .map(([monthKey, totalHours]) => ({
      monthKey,
      totalHours: Number(totalHours.toFixed(2)),
    }))
    .sort((a, b) => (a.monthKey < b.monthKey ? -1 : 1));

  const weeklyRows = Array.from(rowMap.values()).sort((a, b) =>
    a.weekStartDate === b.weekStartDate
      ? a.projectName.localeCompare(b.projectName)
      : a.weekStartDate - b.weekStartDate
  );

  return {
    threshold,
    weeklySummary,
    monthlySummary,
    weeklyRows,
    projects: projectsList,
    statuses: ["All", "Draft", "Submitted", "Approved", "Recalled"] as const,
  };
}

export function buildCsv(weeklyRows: WeeklyRow[]) {
  const header = [
    "Week Start",
    "Project",
    "Task",
    "Role",
    "Type",
    "Sun",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
    "Total",
  ];

  const lines = [header.join(",")];
  for (const row of weeklyRows) {
    const weekStart = new Date(row.weekStartDate)
      .toISOString()
      .slice(0, 10);
    lines.push(
      [
        weekStart,
        row.projectName,
        row.taskName,
        row.roleName,
        row.entryType,
        row.sun.toFixed(2),
        row.mon.toFixed(2),
        row.tue.toFixed(2),
        row.wed.toFixed(2),
        row.thu.toFixed(2),
        row.fri.toFixed(2),
        row.sat.toFixed(2),
        row.total.toFixed(2),
      ]
        .map((value) => (String(value).includes(",") ? `"${value}"` : value))
        .join(",")
    );
  }
  return lines.join("\n");
}
