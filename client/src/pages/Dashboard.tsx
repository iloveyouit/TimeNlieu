import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { StatCard } from "@/components/StatCard";
import { WeeklyChart } from "@/components/WeeklyChart";
import { LieuTimeChart } from "@/components/LieuTimeChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TimesheetEntry, DashboardStats } from "@shared/schema";

export default function Dashboard() {
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

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: entries = [], isLoading: entriesLoading } = useQuery<TimesheetEntry[]>({
    queryKey: ["/api/timesheet-entries"],
  });

  const recentEntries = entries.slice(0, 5);
  const isLoading = statsLoading || entriesLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card rounded-lg border border-border p-6 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-muted rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="page-dashboard">
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-muted-foreground mt-1">
          Overview of your timesheet and lieu time
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Lieu Balance"
          value={stats?.lieuBalance?.toFixed(1) || "0.0"}
          unit="hrs"
          icon="clock"
          color="success"
          trend={stats && stats.lieuBalance > 0 ? "up" : undefined}
          data-testid="card-lieu-balance"
        />
        <StatCard
          title="This Week"
          value={stats?.thisWeekHours?.toFixed(1) || "0.0"}
          unit="/ 40 hrs"
          icon="calendar-week"
          color="primary"
          progress={stats?.thisWeekHours ? (stats.thisWeekHours / 40) * 100 : 0}
          data-testid="card-this-week"
        />
        <StatCard
          title="Total Entries"
          value={stats?.totalEntries?.toString() || "0"}
          unit="entries"
          icon="list"
          color="muted"
          data-testid="card-total-entries"
        />
        <StatCard
          title="Avg Hours/Week"
          value={stats?.avgWeeklyHours?.toFixed(1) || "0.0"}
          unit="hrs"
          icon="chart-bar"
          color="warning"
          data-testid="card-avg-hours"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WeeklyChart />
        <LieuTimeChart lieuBalance={stats?.lieuBalance || 0} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Recent Entries</CardTitle>
          <a
            href="/entries"
            className="text-primary text-sm font-medium hover:underline"
            data-testid="link-view-all-entries"
          >
            View All
          </a>
        </CardHeader>
        <CardContent>
          {recentEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No entries yet. Upload your first timesheet to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">
                      Date
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">
                      Project
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">
                      Task
                    </th>
                    <th className="text-right px-6 py-3 text-sm font-medium text-muted-foreground">
                      Hours
                    </th>
                    <th className="text-center px-6 py-3 text-sm font-medium text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-muted/50" data-testid={`row-entry-${entry.id}`}>
                      <td className="px-6 py-4 text-sm" data-testid={`text-date-${entry.id}`}>
                        {new Date(entry.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium" data-testid={`text-project-${entry.id}`}>
                        {entry.project}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground" data-testid={`text-task-${entry.id}`}>
                        {entry.task}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-mono" data-testid={`text-hours-${entry.id}`}>
                        {parseFloat(entry.hours).toFixed(1)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            entry.status === "approved"
                              ? "bg-success/10 text-success"
                              : entry.status === "rejected"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-warning/10 text-warning"
                          }`}
                          data-testid={`badge-status-${entry.id}`}
                        >
                          {entry.status.charAt(0).toUpperCase() +
                            entry.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
