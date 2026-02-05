import { db } from "@/db";
import { projectTasks, projects, roles, timesheetEntries } from "@/db/schema";
import { and, asc, eq, gte, lt } from "drizzle-orm";

const DAY_MS = 24 * 60 * 60 * 1000;

const toDateKey = (dateMs: number) => {
  const date = new Date(dateMs);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export function startOfMonthUtc(dateMs: number) {
  const date = new Date(dateMs);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

export function nextMonthUtc(monthStartMs: number) {
  const date = new Date(monthStartMs);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
}

export async function getMonthDataForUser(userId: string, monthStartDate: number) {
  const start = startOfMonthUtc(monthStartDate);
  const end = nextMonthUtc(start);

  const [entries, projectsList, tasksList, rolesList] = await Promise.all([
    db
      .select()
      .from(timesheetEntries)
      .where(
        and(
          eq(timesheetEntries.userId, userId),
          gte(timesheetEntries.date, new Date(start)),
          lt(timesheetEntries.date, new Date(end))
        )
      ),
    db.select().from(projects).orderBy(asc(projects.name)),
    db.select().from(projectTasks).orderBy(asc(projectTasks.name)),
    db.select().from(roles).orderBy(asc(roles.name)),
  ]);

  const projectMap = new Map(projectsList.map((p) => [p.id, p]));
  const taskMap = new Map(tasksList.map((t) => [t.id, t]));
  const roleMap = new Map(rolesList.map((r) => [r.id, r]));

  const totals: Record<string, number> = {};
  const entriesByDate: Record<
    string,
    Array<{
      id: string;
      date: number;
      hours: number;
      projectName: string;
      taskName: string;
      roleName: string;
      entryType: string;
      status: string;
    }>
  > = {};

  for (const entry of entries) {
    const key = toDateKey(entry.date.getTime());
    totals[key] = (totals[key] ?? 0) + entry.hours;
    const project = entry.projectId ? projectMap.get(entry.projectId) : null;
    const task = entry.taskId ? taskMap.get(entry.taskId) : null;
    const role = entry.roleId ? roleMap.get(entry.roleId) : null;
    const row = {
      id: entry.id,
      date: entry.date.getTime(),
      hours: entry.hours,
      projectName: project ? `${project.code} — ${project.name}` : "Unassigned",
      taskName: task ? `${task.code ? `${task.code} — ` : ""}${task.name}` : "Unassigned",
      roleName: role ? role.name : "Unassigned",
      entryType: entry.entryType ?? "Work",
      status: entry.status ?? "Draft",
    };
    if (!entriesByDate[key]) {
      entriesByDate[key] = [row];
    } else {
      entriesByDate[key].push(row);
    }
  }

  const formattedTotals: Record<string, number> = {};
  for (const [key, value] of Object.entries(totals)) {
    formattedTotals[key] = Number(value.toFixed(2));
  }

  return {
    monthStartDate: start,
    monthEndDate: end - DAY_MS,
    totals: formattedTotals,
    entriesByDate,
  };
}
