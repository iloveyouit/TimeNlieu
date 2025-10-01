import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WeeklySummary, TimesheetEntry } from "@shared/schema";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function Reports() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: summaries = [], isLoading: summariesLoading } = useQuery<WeeklySummary[]>({
    queryKey: ["/api/weekly-summaries"],
  });

  const { data: entries = [], isLoading: entriesLoading } = useQuery<TimesheetEntry[]>({
    queryKey: ["/api/timesheet-entries"],
  });

  const isLoading = summariesLoading || entriesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Calculate stats for this month
  const now = new Date();
  const thisMonthEntries = entries.filter((e) => {
    const entryDate = new Date(e.date);
    return (
      entryDate.getMonth() === now.getMonth() &&
      entryDate.getFullYear() === now.getFullYear()
    );
  });

  const totalHours = thisMonthEntries.reduce(
    (sum, e) => sum + parseFloat(e.hours),
    0
  );

  const lieuEarned = summaries
    .slice(0, 4)
    .reduce((sum, s) => sum + parseFloat(s.overtimeHours), 0);

  const avgDaily = thisMonthEntries.length > 0 ? totalHours / thisMonthEntries.length : 0;

  // Project distribution
  const projectHours: { [key: string]: number } = {};
  entries.forEach((e) => {
    projectHours[e.project] = (projectHours[e.project] || 0) + parseFloat(e.hours);
  });

  const projectData = Object.entries(projectHours)
    .map(([name, hours]) => ({ name, hours }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 4);

  const weeklyChartData = summaries
    .slice(0, 8)
    .reverse()
    .map((s, i) => ({
      name: `W${i + 1}`,
      hours: parseFloat(s.totalHours),
    }));

  const totalProjectHours = projectData.reduce((sum, p) => sum + p.hours, 0);

  return (
    <div className="space-y-6" data-testid="page-reports">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Reports & Analytics</h2>
          <p className="text-muted-foreground mt-1">
            Visualize your time tracking data and lieu balance trends
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground font-medium mb-2">
              Total Hours Worked
            </p>
            <p className="text-3xl font-bold font-mono" data-testid="stat-total-hours">
              {totalHours.toFixed(1)}
            </p>
            <p className="text-sm text-muted-foreground mt-2">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground font-medium mb-2">
              Lieu Time Earned
            </p>
            <p className="text-3xl font-bold font-mono text-success" data-testid="stat-lieu-earned">
              +{lieuEarned.toFixed(1)}
            </p>
            <p className="text-sm text-muted-foreground mt-2">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground font-medium mb-2">
              Average Daily Hours
            </p>
            <p className="text-3xl font-bold font-mono" data-testid="stat-avg-daily">
              {avgDaily.toFixed(1)}
            </p>
            <p className="text-sm text-muted-foreground mt-2">This month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Hours</CardTitle>
          </CardHeader>
          <CardContent>
            {weeklyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklyChartData}>
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
                  <Bar dataKey="hours" fill="hsl(217 91% 60%)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No data available. Add timesheet entries to see weekly trends.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Project Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {projectData.length > 0 ? (
              <div className="space-y-4">
                {projectData.map((project, i) => {
                  const colors = [
                    "hsl(217 91% 60%)",
                    "hsl(158 64% 52%)",
                    "hsl(43 96% 56%)",
                    "hsl(0 84% 60%)",
                  ];
                  return (
                    <div key={project.name}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{project.name}</span>
                        <span className="text-sm font-mono text-muted-foreground">
                          {project.hours.toFixed(1)} hrs ({((project.hours / totalProjectHours) * 100).toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-3">
                        <div
                          className="h-3 rounded-full"
                          style={{
                            width: `${(project.hours / totalProjectHours) * 100}%`,
                            backgroundColor: colors[i % colors.length],
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No data available. Add timesheet entries to see project distribution.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lieu Time History</CardTitle>
        </CardHeader>
        <CardContent>
          {summaries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">
                      Week
                    </th>
                    <th className="text-right px-6 py-3 text-sm font-medium text-muted-foreground">
                      Hours Worked
                    </th>
                    <th className="text-right px-6 py-3 text-sm font-medium text-muted-foreground">
                      Overtime
                    </th>
                    <th className="text-right px-6 py-3 text-sm font-medium text-muted-foreground">
                      Lieu Earned
                    </th>
                    <th className="text-right px-6 py-3 text-sm font-medium text-muted-foreground">
                      Balance
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {summaries.slice(0, 10).map((summary) => (
                    <tr key={summary.id} className="hover:bg-muted/50" data-testid={`row-summary-${summary.id}`}>
                      <td className="px-6 py-4 text-sm">
                        {new Date(summary.weekStartDate).toLocaleDateString()} -{" "}
                        {new Date(summary.weekEndDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-mono">
                        {parseFloat(summary.totalHours).toFixed(1)}
                      </td>
                      <td
                        className={`px-6 py-4 text-sm text-right font-mono ${
                          parseFloat(summary.overtimeHours) > 0
                            ? "text-warning"
                            : "text-muted-foreground"
                        }`}
                      >
                        {parseFloat(summary.overtimeHours) > 0 ? "+" : ""}
                        {parseFloat(summary.overtimeHours).toFixed(1)}
                      </td>
                      <td
                        className={`px-6 py-4 text-sm text-right font-mono ${
                          parseFloat(summary.overtimeHours) > 0
                            ? "text-success"
                            : "text-muted-foreground"
                        }`}
                      >
                        {parseFloat(summary.overtimeHours) > 0 ? "+" : ""}
                        {parseFloat(summary.overtimeHours).toFixed(1)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-mono font-semibold">
                        {parseFloat(summary.lieuBalance).toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No weekly summaries yet. Add timesheet entries to see reports.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
