import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WeeklySummary } from "@shared/schema";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function WeeklyHoursChart() {
  const { data: summaries = [], isLoading } = useQuery<WeeklySummary[]>({
    queryKey: ["/api/weekly-summaries"],
  });

  const chartData = summaries
    .slice(0, 8)
    .reverse()
    .map((s, i) => ({
      name: `W${i + 1}`,
      hours: parseFloat(s.totalHours),
    }));

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly Hours</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Hours</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
              <XAxis dataKey="name" stroke="hsl(215 16% 47%)" />
              <YAxis stroke="hsl(215 16% 47%)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(0 0% 100%)",
                  border: "1px solid hsl(214 32% 91%)",
                  borderRadius: "8px",
                }}
              />
              <Bar
                dataKey="hours"
                fill="hsl(217 91% 60%)"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No data available. Add timesheet entries to see weekly trends.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
