import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAdminData } from "@/lib/admin-actions";
import { AdminView } from "@/app/admin/admin-view";

export default async function Admin() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return null;
  }
  const [user] = await db
    .select({ isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const adminData = user?.isAdmin ? await getAdminData() : null;

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <Sidebar />
      <div className="flex flex-col">
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          <div className="flex items-center">
            <h1 className="text-lg font-semibold md:text-2xl">Admin</h1>
          </div>
          {user?.isAdmin && adminData ? (
            <AdminView
              initialProjects={adminData.projects}
              initialTasks={adminData.projectTasks}
              initialRoles={adminData.roles}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
              <div className="flex flex-col items-center gap-1 text-center">
                <h3 className="text-2xl font-bold tracking-tight">
                  You do not have access to the admin page.
                </h3>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
