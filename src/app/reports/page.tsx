import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getReportDataForUser } from "@/lib/reports";
import { ReportsView } from "@/app/reports/reports-view";
import { startOfWeekUtc } from "@/lib/timesheet";

export default async function Reports() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return null;
  }

  const weekStart = startOfWeekUtc(Date.now());
  const filters = {
    startDate: weekStart,
    endDate: weekStart + 7 * 24 * 60 * 60 * 1000,
    status: "Approved",
    projectId: "All",
  } as const;
  const initialData = await getReportDataForUser(userId, filters);

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <Sidebar />
      <div className="flex flex-col">
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          <div className="flex items-center">
            <h1 className="text-lg font-semibold md:text-2xl">Reports</h1>
          </div>
          <ReportsView initialData={initialData} initialFilters={filters} />
        </main>
      </div>
    </div>
  );
}
