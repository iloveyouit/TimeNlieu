import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Upload from "@/pages/Upload";
import Entries from "@/pages/Entries";
import Reports from "@/pages/Reports";
import Calendar from "@/pages/Calendar";
import Admin from "@/pages/Admin";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col min-h-screen">
        <Header />
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </main>
    </div>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/">
            <AuthenticatedLayout>
              <Dashboard />
            </AuthenticatedLayout>
          </Route>
          <Route path="/upload">
            <AuthenticatedLayout>
              <Upload />
            </AuthenticatedLayout>
          </Route>
          <Route path="/entries">
            <AuthenticatedLayout>
              <Entries />
            </AuthenticatedLayout>
          </Route>
          <Route path="/reports">
            <AuthenticatedLayout>
              <Reports />
            </AuthenticatedLayout>
          </Route>
          <Route path="/calendar">
            <AuthenticatedLayout>
              <Calendar />
            </AuthenticatedLayout>
          </Route>
          <Route path="/admin">
            <AuthenticatedLayout>
              <Admin />
            </AuthenticatedLayout>
          </Route>
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
