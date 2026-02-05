import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAdminData } from "@/lib/admin-actions";
import { getAllUsers } from "@/lib/admin-user-actions";
import { AdminView } from "@/app/admin/admin-view";
import { UsersManagement } from "@/app/admin/users-management";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const allUsers = user?.isAdmin ? await getAllUsers() : [];

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
            <Tabs defaultValue="reference" className="w-full">
              <TabsList>
                <TabsTrigger value="reference">Reference Data</TabsTrigger>
                <TabsTrigger value="users">Users</TabsTrigger>
              </TabsList>
              <TabsContent value="reference" className="mt-4">
                <AdminView
                  initialProjects={adminData.projects}
                  initialTasks={adminData.projectTasks}
                  initialRoles={adminData.roles}
                />
              </TabsContent>
              <TabsContent value="users" className="mt-4">
                <UsersManagement initialUsers={allUsers} />
              </TabsContent>
            </Tabs>
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
