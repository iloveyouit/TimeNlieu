import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { EntriesGrid } from "@/app/entries/entries-grid";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getWeekDataForUser, startOfWeekUtc } from "@/lib/timesheet";

export default async function Entries() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return null;
  }
  const weekStartDate = startOfWeekUtc(Date.now());
  const initialData = await getWeekDataForUser(userId, weekStartDate);

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <Sidebar />
      <div className="flex flex-col">
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          <div className="flex items-center">
            <h1 className="text-lg font-semibold md:text-2xl">Entries</h1>
          </div>
          <EntriesGrid initialData={initialData} />
        </main>
      </div>
    </div>
  );
}
