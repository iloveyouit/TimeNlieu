import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getMonthDataForUser, startOfMonthUtc } from "@/lib/calendar";
import { CalendarView } from "@/app/calendar/calendar-view";

export default async function Calendar() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return null;
  }
  const monthStartDate = startOfMonthUtc(Date.now());
  const initialData = await getMonthDataForUser(userId, monthStartDate);

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <Sidebar />
      <div className="flex flex-col">
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          <div className="flex items-center">
            <h1 className="text-lg font-semibold md:text-2xl">Calendar</h1>
          </div>
          <CalendarView initialData={initialData} />
        </main>
      </div>
    </div>
  );
}
