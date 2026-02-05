"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deleteWeekRow,
  getWeekData,
  submitWeek,
  updateWeekRowMeta,
  upsertTimesheetEntry,
} from "@/lib/timesheet-actions";

type Project = { id: string; name: string; code: string; clientName: string | null; isActive: boolean | null };
type ProjectTask = { id: string; projectId: string; name: string; code: string | null };
type Role = { id: string; name: string };
type Entry = {
  id: string;
  date: number;
  hours: number;
  projectId: string | null;
  taskId: string | null;
  roleId: string | null;
  entryType: "Work" | "Admin";
  status: "Draft" | "Submitted" | "Approved" | "Recalled" | string;
};

type WeekData = {
  weekStartDate: number;
  weekEndDate: number;
  threshold: number;
  entries: Entry[];
  projects: Project[];
  projectTasks: ProjectTask[];
  roles: Role[];
};

type RowMeta = {
  projectId: string | null;
  taskId: string | null;
  roleId: string | null;
  entryType: "Work" | "Admin";
};

type CellState = {
  value: string;
  entryId?: string;
  status: "saved" | "dirty" | "saving";
  error?: string | null;
};

type RowState = {
  id: string;
  meta: RowMeta;
  cells: Record<string, CellState>;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const HOURS_PATTERN = /^\d{0,2}(\.\d{0,2})?$/;

const toIsoDate = (dateMs: number) => {
  const date = new Date(dateMs);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const formatShortDate = (dateMs: number) =>
  new Date(dateMs).toLocaleDateString("en-US");

const weekStartFromToday = () => {
  const now = new Date();
  const day = now.getUTCDay();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day);
};

const rowKey = (meta: RowMeta) =>
  `${meta.projectId ?? "null"}|${meta.taskId ?? "null"}|${meta.roleId ?? "null"}|${meta.entryType}`;

const getRowStatus = (entries: Entry[], meta: RowMeta) => {
  const statuses = entries
    .filter(
      (entry) =>
        entry.projectId === meta.projectId &&
        entry.taskId === meta.taskId &&
        entry.roleId === meta.roleId &&
        entry.entryType === meta.entryType
    )
    .map((entry) => entry.status);

  if (statuses.includes("Approved")) return "Approved";
  if (statuses.includes("Submitted")) return "Submitted";
  if (statuses.includes("Recalled")) return "Recalled";
  return "Draft";
};

const validateHours = (value: string) => {
  if (value.trim() === "") return { valid: true, hours: 0 };
  if (!HOURS_PATTERN.test(value)) {
    return { valid: false, error: "Use up to 2 decimal places." };
  }
  const hours = Number.parseFloat(value);
  if (!Number.isFinite(hours)) {
    return { valid: false, error: "Enter a number." };
  }
  if (hours < 0 || hours > 24) {
    return { valid: false, error: "Hours must be between 0 and 24." };
  }
  return { valid: true, hours };
};

const buildRows = (entries: Entry[], localRows: RowMeta[]) => {
  const byRow = new Map<string, RowState>();

  for (const entry of entries) {
    const meta: RowMeta = {
      projectId: entry.projectId,
      taskId: entry.taskId,
      roleId: entry.roleId,
      entryType: entry.entryType,
    };
    const key = rowKey(meta);
    if (!byRow.has(key)) {
      byRow.set(key, { id: key, meta, cells: {} });
    }
    const row = byRow.get(key)!;
    const dateKey = toIsoDate(entry.date);
    row.cells[dateKey] = {
      value: entry.hours.toFixed(2),
      entryId: entry.id,
      status: "saved",
    };
  }

  for (const meta of localRows) {
    const key = rowKey(meta);
    if (!byRow.has(key)) {
      byRow.set(key, { id: key, meta, cells: {} });
    }
  }

  return Array.from(byRow.values());
};

export function EntriesGrid({ initialData }: { initialData: WeekData }) {
  const [weekStartDate, setWeekStartDate] = useState(
    initialData.weekStartDate ?? weekStartFromToday()
  );
  const [data, setData] = useState<WeekData>(initialData);
  const [rows, setRows] = useState<RowState[]>(() =>
    buildRows(initialData.entries, [])
  );
  const [isPending, startTransition] = useTransition();

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, idx) => {
        const date = weekStartDate + idx * DAY_MS;
        return {
          label: DAYS[idx],
          date,
          dateKey: toIsoDate(date),
        };
      }),
    [weekStartDate]
  );

  useEffect(() => {
    startTransition(async () => {
      const next = await getWeekData({ weekStartDate });
      setData(next);
      setRows(buildRows(next.entries, []));
    });
  }, [weekStartDate]);

  const handleWeekChange = (delta: number) => {
    setWeekStartDate((prev) => prev + delta * 7 * DAY_MS);
  };

  const handleAddRow = () => {
    const nextMeta: RowMeta = {
      projectId: null,
      taskId: null,
      roleId: null,
      entryType: "Work",
    };
    setRows((prev) => [...prev, { id: rowKey(nextMeta), meta: nextMeta, cells: {} }]);
  };

  const handleRowMetaChange = async (
    rowId: string,
    nextMeta: RowMeta,
    previousMeta: RowMeta
  ) => {
    const nextId = rowKey(nextMeta);
    setRows((prev) =>
      prev.map((row) =>
        row.id === rowId ? { ...row, id: nextId, meta: nextMeta } : row
      )
    );
    const isPersisted = data.entries.some(
      (entry) =>
        rowKey({
          projectId: entry.projectId,
          taskId: entry.taskId,
          roleId: entry.roleId,
          entryType: entry.entryType,
        }) === rowId
    );
    if (isPersisted) {
      await updateWeekRowMeta({
        weekStartDate,
        previous: previousMeta,
        next: nextMeta,
      });
    }
  };

  const handleDeleteRow = async (row: RowState) => {
    setRows((prev) => prev.filter((item) => item.id !== row.id));
    await deleteWeekRow({
      weekStartDate,
      row: row.meta,
    });
    const next = await getWeekData({ weekStartDate });
    setData(next);
    setRows(buildRows(next.entries, []));
  };

  const handleCellChange = (rowId: string, dateKey: string, value: string) => {
    const validation = validateHours(value);
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const existing = row.cells[dateKey];
        return {
          ...row,
          cells: {
            ...row.cells,
            [dateKey]: {
              value,
              entryId: existing?.entryId,
              status: "dirty",
              error: validation.valid ? null : validation.error ?? null,
            },
          },
        };
      })
    );
  };

  const handleCellBlur = async (row: RowState, dateKey: string, dateMs: number) => {
    const cell = row.cells[dateKey];
    if (!cell || cell.status === "saving") return;
    const validation = validateHours(cell.value);
    if (!validation.valid) {
      return;
    }
    const hours = validation.hours ?? 0;
    setRows((prev) =>
      prev.map((item) =>
        item.id === row.id
          ? {
              ...item,
              cells: {
                ...item.cells,
                [dateKey]: { ...cell, status: "saving", error: null },
              },
            }
          : item
      )
    );

    const result = await upsertTimesheetEntry({
      date: dateMs,
      hours,
      projectId: row.meta.projectId,
      taskId: row.meta.taskId,
      roleId: row.meta.roleId,
      entryType: row.meta.entryType,
      status: "Draft",
    });

    setRows((prev) =>
      prev.map((item) => {
        if (item.id !== row.id) return item;
        if (result?.error) {
          return {
            ...item,
            cells: {
              ...item.cells,
              [dateKey]: {
                value: cell.value,
                entryId: cell.entryId,
                status: "saved",
                error: result.error,
              },
            },
          };
        }
        if (result?.deleted) {
          const nextCells = { ...item.cells };
          delete nextCells[dateKey];
          return { ...item, cells: nextCells };
        }
        return {
          ...item,
          cells: {
            ...item.cells,
            [dateKey]: {
              value: Number.isFinite(hours) ? hours.toFixed(2) : "0.00",
              entryId: result?.entryId,
              status: "saved",
              error: null,
            },
          },
        };
      })
    );
  };

  const rowTotals = (row: RowState) =>
    days.reduce((sum, day) => {
      const cell = row.cells[day.dateKey];
      const value = cell ? Number.parseFloat(cell.value) : 0;
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);

  const columnTotals = days.map((day) =>
    rows.reduce((sum, row) => {
      const cell = row.cells[day.dateKey];
      const value = cell ? Number.parseFloat(cell.value) : 0;
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0)
  );

  const weeklyTotal = columnTotals.reduce((sum, value) => sum + value, 0);
  const overtime = Math.max(0, weeklyTotal - data.threshold);

  const filteredTasks = (projectId: string | null) =>
    projectId
      ? data.projectTasks.filter((task) => task.projectId === projectId)
      : data.projectTasks;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => handleWeekChange(-1)}>
            Prev
          </Button>
          <Button variant="outline" onClick={() => handleWeekChange(1)}>
            Next
          </Button>
          <span className="text-sm text-muted-foreground">
            {formatShortDate(weekStartDate)} – {formatShortDate(weekStartDate + 6 * DAY_MS)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleAddRow}>
            Add Row
          </Button>
          <Button onClick={() => submitWeek({ weekStartDate })}>
            Submit Week
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left">Project</th>
              <th className="px-3 py-2 text-left">Task</th>
              <th className="px-3 py-2 text-left">Role</th>
              <th className="px-3 py-2 text-left">Type</th>
              {days.map((day) => (
                <th key={day.dateKey} className="px-3 py-2 text-left">
                  <div className="font-medium">{day.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatShortDate(day.date)}
                  </div>
                </th>
              ))}
              <th className="px-3 py-2 text-left">Total</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-3 py-6 text-center text-muted-foreground">
                  No entries for this week yet.
                </td>
              </tr>
            ) : null}
            {rows.map((row) => {
              const total = rowTotals(row);
              const previousMeta = row.meta;
              const rowStatus = getRowStatus(data.entries, row.meta);
              const isLocked = rowStatus !== "Draft";
              return (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2">
                    <select
                      className="h-9 w-full rounded-md border bg-background px-2"
                      value={row.meta.projectId ?? ""}
                      disabled={isLocked}
                      onChange={(event) => {
                        const nextMeta = {
                          ...row.meta,
                          projectId: event.target.value || null,
                          taskId: null,
                        };
                        handleRowMetaChange(row.id, nextMeta, previousMeta);
                      }}
                    >
                      <option value="">Unassigned</option>
                      {data.projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.code} — {project.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className="h-9 w-full rounded-md border bg-background px-2"
                      value={row.meta.taskId ?? ""}
                      disabled={isLocked}
                      onChange={(event) => {
                        const nextMeta = {
                          ...row.meta,
                          taskId: event.target.value || null,
                        };
                        handleRowMetaChange(row.id, nextMeta, previousMeta);
                      }}
                    >
                      <option value="">Unassigned</option>
                      {filteredTasks(row.meta.projectId).map((task) => (
                        <option key={task.id} value={task.id}>
                          {task.code ? `${task.code} — ${task.name}` : task.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className="h-9 w-full rounded-md border bg-background px-2"
                      value={row.meta.roleId ?? ""}
                      disabled={isLocked}
                      onChange={(event) => {
                        const nextMeta = {
                          ...row.meta,
                          roleId: event.target.value || null,
                        };
                        handleRowMetaChange(row.id, nextMeta, previousMeta);
                      }}
                    >
                      <option value="">Unassigned</option>
                      {data.roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className="h-9 w-full rounded-md border bg-background px-2"
                      value={row.meta.entryType}
                      disabled={isLocked}
                      onChange={(event) => {
                        const nextMeta = {
                          ...row.meta,
                          entryType: event.target.value as RowMeta["entryType"],
                        };
                        handleRowMetaChange(row.id, nextMeta, previousMeta);
                      }}
                    >
                      <option value="Work">Work</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </td>
                  {days.map((day) => {
                    const cell = row.cells[day.dateKey];
                    const status = cell?.status ?? "saved";
                    const error = cell?.error;
                    return (
                      <td key={day.dateKey} className="px-3 py-2">
                        <Input
                          type="number"
                          step="0.25"
                          min="0"
                          max="24"
                          disabled={isLocked}
                          className={[
                            status === "dirty" ? "border-amber-400" : "",
                            status === "saving" ? "border-blue-400" : "",
                            error ? "border-red-500" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          value={cell?.value ?? ""}
                          onChange={(event) =>
                            handleCellChange(row.id, day.dateKey, event.target.value)
                          }
                          onBlur={() => handleCellBlur(row, day.dateKey, day.date)}
                          title={error ?? undefined}
                        />
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 font-medium">
                    <div className="flex flex-col gap-1">
                      <span>{total.toFixed(2)}</span>
                      <Badge
                        variant={rowStatus === "Draft" ? "secondary" : "default"}
                        className="w-fit text-xs"
                      >
                        {rowStatus}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <Button variant="ghost" onClick={() => handleDeleteRow(row)} disabled={isLocked}>
                      Delete
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t bg-muted/50">
            <tr>
              <td className="px-3 py-2 font-medium" colSpan={4}>
                Totals
              </td>
              {columnTotals.map((total, idx) => (
                <td key={`total-${idx}`} className="px-3 py-2 font-medium">
                  {total.toFixed(2)}
                </td>
              ))}
              <td className="px-3 py-2 font-semibold">{weeklyTotal.toFixed(2)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="text-sm text-muted-foreground">
        Weekly total: <span className="font-medium text-foreground">{weeklyTotal.toFixed(2)}</span>{" "}
        · Standard hours:{" "}
        <span className="font-medium text-foreground">{data.threshold.toFixed(2)}</span>{" "}
        · Time in lieu:{" "}
        <span className="font-medium text-foreground">{overtime.toFixed(2)}</span>
        {isPending ? " · Loading..." : ""}
      </div>
    </div>
  );
}
