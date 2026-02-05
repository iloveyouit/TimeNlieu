import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getReferenceData } from "@/lib/reference-data";
import { UploadView } from "@/app/upload/upload-view";
import { CSVUploadView } from "@/app/upload/csv-upload-view";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function Upload() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return null;
  }
  const referenceData = await getReferenceData();

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <Sidebar />
      <div className="flex flex-col">
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          <div className="flex items-center">
            <h1 className="text-lg font-semibold md:text-2xl">Upload</h1>
          </div>
          <Tabs defaultValue="csv" className="w-full">
            <TabsList>
              <TabsTrigger value="csv">CSV / Excel</TabsTrigger>
              <TabsTrigger value="screenshot">Screenshot (OCR)</TabsTrigger>
            </TabsList>
            <TabsContent value="csv" className="mt-4">
              <CSVUploadView />
            </TabsContent>
            <TabsContent value="screenshot" className="mt-4">
              <UploadView
                projects={referenceData.projects}
                projectTasks={referenceData.projectTasks}
                roles={referenceData.roles}
              />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
