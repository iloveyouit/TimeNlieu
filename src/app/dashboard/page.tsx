import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard";
import { DashboardCharts } from "@/app/dashboard/dashboard-charts";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return null;
  }

  const data = await getDashboardData(userId);
  const progress = Math.min(100, (data.thisWeekTotal / data.threshold) * 100);
  const balancePositive = data.runningBalance >= 0;

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <Sidebar />
      <div className="flex flex-col">
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          <div className="flex items-center">
            <h1 className="text-lg font-semibold md:text-2xl">Dashboard</h1>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle>Lieu Balance</CardTitle>
                <CardDescription>Running balance</CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-3xl font-semibold ${balancePositive ? "text-emerald-600" : "text-red-600"}`}
                >
                  {data.runningBalance.toFixed(2)} hrs
                </div>
                <p className="text-sm text-muted-foreground">
                  Change vs last week: {data.balanceChange >= 0 ? "+" : ""}
                  {data.balanceChange.toFixed(2)} hrs
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>This Week</CardTitle>
                <CardDescription>Hours logged</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">
                  {data.thisWeekTotal.toFixed(2)} hrs
                </div>
                <div className="mt-3">
                  <Progress value={progress} />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Threshold: {data.threshold.toFixed(2)} hrs · Lieu earned:{" "}
                  {data.thisWeekOvertime.toFixed(2)} hrs
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Hours by Project</CardTitle>
                <CardDescription>Current week</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">
                  {data.hoursByProjectWeek.reduce((sum, row) => sum + row.hours, 0).toFixed(2)} hrs
                </div>
                <p className="text-sm text-muted-foreground">
                  {data.hoursByProjectWeek.length} active project entries
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Weekly Trend</CardTitle>
                <CardDescription>Last 12 weeks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">
                  {data.weeklyTrend[data.weeklyTrend.length - 1]?.totalHours.toFixed(2)} hrs
                </div>
                <p className="text-sm text-muted-foreground">
                  Most recent week total
                </p>
              </CardContent>
            </Card>
          </div>

          <DashboardCharts
            hoursByProjectWeek={data.hoursByProjectWeek}
            hoursByProjectFourWeeks={data.hoursByProjectFourWeeks}
            weeklyTrend={data.weeklyTrend}
            threshold={data.threshold}
          />
        </main>
      </div>
    </div>
  );
}
