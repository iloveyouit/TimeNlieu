"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
  Cell,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";

type ProjectHours = { name: string; hours: number };
type WeeklyTrend = { weekStartDate: number; totalHours: number };

type DashboardChartsProps = {
  hoursByProjectWeek: ProjectHours[];
  hoursByProjectFourWeeks: ProjectHours[];
  weeklyTrend: WeeklyTrend[];
  threshold: number;
};

const COLORS = [
  "#0f766e",
  "#2563eb",
  "#f97316",
  "#16a34a",
  "#0ea5e9",
  "#db2777",
  "#7c3aed",
  "#a16207",
];

const formatWeekLabel = (weekStartDate: number) =>
  new Date(weekStartDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

export function DashboardCharts({
  hoursByProjectWeek,
  hoursByProjectFourWeeks,
  weeklyTrend,
  threshold,
}: DashboardChartsProps) {
  const [range, setRange] = useState<"week" | "fourWeeks">("week");
  const projectData =
    range === "week" ? hoursByProjectWeek : hoursByProjectFourWeeks;

  const trendData = useMemo(
    () =>
      weeklyTrend.map((point) => ({
        ...point,
        label: formatWeekLabel(point.weekStartDate),
      })),
    [weeklyTrend]
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>Hours by Project</CardTitle>
            <CardDescription>
              {range === "week" ? "This week" : "Trailing 4 weeks"}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={range === "week" ? "default" : "outline"}
              onClick={() => setRange("week")}
            >
              Week
            </Button>
            <Button
              size="sm"
              variant={range === "fourWeeks" ? "default" : "outline"}
              onClick={() => setRange("fourWeeks")}
            >
              4 Weeks
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              hours: { label: "Hours", color: "hsl(var(--chart-1))" },
            }}
          >
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(2)} hrs`,
                    name,
                  ]}
                />
                <Pie
                  data={projectData}
                  dataKey="hours"
                  nameKey="name"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={2}
                >
                  {projectData.map((entry, index) => (
                    <Cell
                      key={`slice-${entry.name}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
          {projectData.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No project hours logged yet.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Trend</CardTitle>
          <CardDescription>Last 12 weeks</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              totalHours: { label: "Total Hours", color: "hsl(var(--chart-2))" },
            }}
          >
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendData} margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tickMargin={8} />
                <YAxis width={32} />
                <Tooltip
                  formatter={(value: number) => `${value.toFixed(2)} hrs`}
                />
                <Line
                  type="monotone"
                  dataKey="totalHours"
                  stroke="var(--color-totalHours)"
                  strokeWidth={2}
                  dot={false}
                />
                <ReferenceLine
                  y={threshold}
                  stroke="hsl(var(--border))"
                  strokeDasharray="4 4"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
