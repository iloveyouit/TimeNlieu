import { useLocation } from "wouter";
import { NotificationCenter } from "./NotificationCenter";

const pageTitles: { [key: string]: string } = {
  "/": "Dashboard",
  "/upload": "Upload Timesheet",
  "/entries": "My Timesheet Entries",
  "/reports": "Reports & Analytics",
  "/calendar": "Calendar View",
  "/admin": "Admin Panel",
};

export function Header() {
  const [location] = useLocation();
  const title = pageTitles[location] || "Dashboard";

  return (
    <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-30">
      <h1 className="text-2xl font-bold" data-testid="text-page-title">
        {title}
      </h1>
      <NotificationCenter />
    </header>
  );
}
