"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getReportData, exportReportCsv } from "@/lib/reports-actions";

type Project = { id: string; name: string; code: string };
type WeeklySummary = {
  weekStartDate: number;
  weekEndDate: number;
  totalHours: number;
  overtimeHours: number;
};
type MonthlySummary = { monthKey: string; totalHours: number };
type WeeklyRow = {
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

type ReportData = {
  threshold: number;
  weeklySummary: WeeklySummary[];
  monthlySummary: MonthlySummary[];
  weeklyRows: WeeklyRow[];
  projects: Project[];
  statuses: readonly string[];
};

type ReportFilters = {
  startDate: number;
  endDate: number;
  status: string;
  projectId: string;
};

const toDateInput = (dateMs: number) => new Date(dateMs).toISOString().slice(0, 10);
const formatDate = (dateMs: number) =>
  new Date(dateMs).toLocaleDateString("en-US");

export function ReportsView({
  initialData,
  initialFilters,
}: {
  initialData: ReportData;
  initialFilters: ReportFilters;
}) {
  const [filters, setFilters] = useState(initialFilters);
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  const handleApply = () => {
    startTransition(async () => {
      const next = await getReportData(filters);
      setData(next);
    });
  };

  const handleExportCsv = async () => {
    const csv = await exportReportCsv(filters);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "timesheet-report.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const weeklyTotal = useMemo(
    () =>
      data.weeklySummary.reduce((sum, row) => sum + row.totalHours, 0).toFixed(2),
    [data.weeklySummary]
  );

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Date range, project, and status. Default is Approved only.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <label className="text-sm">
            Start Date
            <input
              type="date"
              className="mt-1 h-9 w-full rounded-md border bg-background px-2"
              value={toDateInput(filters.startDate)}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  startDate: new Date(event.target.value).getTime(),
                }))
              }
            />
          </label>
          <label className="text-sm">
            End Date
            <input
              type="date"
              className="mt-1 h-9 w-full rounded-md border bg-background px-2"
              value={toDateInput(filters.endDate - 1)}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  endDate: new Date(event.target.value).getTime() + 24 * 60 * 60 * 1000,
                }))
              }
            />
          </label>
          <label className="text-sm">
            Status
            <select
              className="mt-1 h-9 w-full rounded-md border bg-background px-2"
              value={filters.status}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, status: event.target.value }))
              }
            >
              {data.statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Project
            <select
              className="mt-1 h-9 w-full rounded-md border bg-background px-2"
              value={filters.projectId}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, projectId: event.target.value }))
              }
            >
              <option value="All">All projects</option>
              {data.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.code} — {project.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2 md:col-span-4">
            <Button onClick={handleApply}>Apply Filters</Button>
            <Button variant="secondary" onClick={handleExportCsv}>
              Export CSV
            </Button>
            <Button variant="outline" disabled>
              Export PDF (Coming Soon)
            </Button>
            {isPending ? (
              <span className="text-sm text-muted-foreground">Updating...</span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Totals</CardTitle>
            <CardDescription>Range total: {weeklyTotal} hrs</CardDescription>
          </CardHeader>
          <CardContent>
            {data.weeklySummary.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data for this range.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Week</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Overtime</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.weeklySummary.map((week) => (
                    <TableRow key={week.weekStartDate}>
                      <TableCell>
                        {formatDate(week.weekStartDate)} – {formatDate(week.weekEndDate)}
                      </TableCell>
                      <TableCell>{week.totalHours.toFixed(2)}</TableCell>
                      <TableCell>{week.overtimeHours.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly Totals</CardTitle>
            <CardDescription>Hours per month in range</CardDescription>
          </CardHeader>
          <CardContent>
            {data.monthlySummary.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data for this range.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Total Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.monthlySummary.map((month) => (
                    <TableRow key={month.monthKey}>
                      <TableCell>{month.monthKey}</TableCell>
                      <TableCell>{month.totalHours.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Grid Export Preview</CardTitle>
          <CardDescription>Rows grouped by week and project.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.weeklyRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rows to display.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Week Start</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Sun</TableHead>
                  <TableHead>Mon</TableHead>
                  <TableHead>Tue</TableHead>
                  <TableHead>Wed</TableHead>
                  <TableHead>Thu</TableHead>
                  <TableHead>Fri</TableHead>
                  <TableHead>Sat</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.weeklyRows.map((row, index) => (
                  <TableRow key={`${row.weekStartDate}-${index}`}>
                    <TableCell>{formatDate(row.weekStartDate)}</TableCell>
                    <TableCell>{row.projectName}</TableCell>
                    <TableCell>{row.taskName}</TableCell>
                    <TableCell>{row.roleName}</TableCell>
                    <TableCell>{row.entryType}</TableCell>
                    <TableCell>{row.sun.toFixed(2)}</TableCell>
                    <TableCell>{row.mon.toFixed(2)}</TableCell>
                    <TableCell>{row.tue.toFixed(2)}</TableCell>
                    <TableCell>{row.wed.toFixed(2)}</TableCell>
                    <TableCell>{row.thu.toFixed(2)}</TableCell>
                    <TableCell>{row.fri.toFixed(2)}</TableCell>
                    <TableCell>{row.sat.toFixed(2)}</TableCell>
                    <TableCell>{row.total.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
