"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getMonthData } from "@/lib/calendar-actions";

type MonthEntry = {
  id: string;
  date: number;
  hours: number;
  projectName: string;
  taskName: string;
  roleName: string;
  entryType: string;
  status: string;
};

type MonthData = {
  monthStartDate: number;
  monthEndDate: number;
  totals: Record<string, number>;
  entriesByDate: Record<string, MonthEntry[]>;
};

const toDateKey = (date: Date) => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const formatDate = (date: Date) =>
  date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const formatHours = (hours: number) => `${hours.toFixed(2)} hrs`;

export function CalendarView({ initialData }: { initialData: MonthData }) {
  const [data, setData] = useState(initialData);
  const [month, setMonth] = useState(new Date(initialData.monthStartDate));
  const [selected, setSelected] = useState<Date | undefined>(() => new Date());
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const next = await getMonthData({ monthStartDate: month.getTime() });
      setData(next);
    });
  }, [month]);

  const selectedKey = selected ? toDateKey(selected) : null;
  const selectedEntries = selectedKey ? data.entriesByDate[selectedKey] ?? [] : [];
  const selectedTotal = selectedKey ? data.totals[selectedKey] ?? 0 : 0;

  const modifiers = useMemo(() => {
    const dates = Object.keys(data.totals).map((key) => new Date(`${key}T00:00:00Z`));
    return { hasHours: dates };
  }, [data.totals]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle>Monthly Overview</CardTitle>
          <CardDescription>
            {month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            {isPending ? " · Loading..." : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Calendar
            mode="single"
            month={month}
            onMonthChange={(date) => setMonth(date)}
            selected={selected}
            onSelect={setSelected}
            modifiers={modifiers}
            classNames={{
              day: "relative w-full h-full p-0 text-center select-none",
            }}
            components={{
              DayButton: ({ day, modifiers: dayModifiers, ...props }) => {
                const key = toDateKey(day.date);
                const total = data.totals[key];
                const isOutside = dayModifiers.outside;
                return (
                  <button
                    {...props}
                    type="button"
                    className={`flex h-12 w-12 flex-col items-center justify-center rounded-md text-xs transition-colors ${
                      isOutside ? "text-muted-foreground/60" : "hover:bg-muted"
                    } ${dayModifiers.selected ? "bg-primary/10 text-primary" : ""}`}
                  >
                    <span className="text-sm font-medium">{day.date.getUTCDate()}</span>
                    {total ? (
                      <span className="text-[0.65rem] text-muted-foreground">
                        {total.toFixed(1)}
                      </span>
                    ) : null}
                  </button>
                );
              },
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Day Details</CardTitle>
          <CardDescription>
            {selected ? formatDate(selected) : "Select a day"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-3 text-sm text-muted-foreground">
            Total: <span className="font-medium text-foreground">{formatHours(selectedTotal)}</span>
          </div>
          {selectedEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No entries logged for this day.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.projectName}</TableCell>
                    <TableCell>{entry.taskName}</TableCell>
                    <TableCell>{entry.roleName}</TableCell>
                    <TableCell>{entry.hours.toFixed(2)}</TableCell>
                    <TableCell>{entry.status}</TableCell>
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
