import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

export function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { path: "/", icon: "home", label: "Dashboard" },
    { path: "/upload", icon: "upload", label: "Upload Timesheet" },
    { path: "/entries", icon: "table", label: "My Entries" },
    { path: "/reports", icon: "chart-line", label: "Reports" },
    { path: "/calendar", icon: "calendar", label: "Calendar" },
    ...(user?.isAdmin ? [{ path: "/admin", icon: "user-shield", label: "Admin Panel" }] : []),
  ];

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const initials = user
    ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() ||
      user.email?.[0]?.toUpperCase() || "U"
    : "U";

  return (
    <>
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-card rounded-md border border-border"
        onClick={() => setIsOpen(!isOpen)}
        data-testid="button-toggle-sidebar"
      >
        <i className="fas fa-bars text-xl"></i>
      </button>

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-card border-r border-border flex flex-col transition-transform ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
        data-testid="sidebar"
      >
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <i className="fas fa-clock text-xl text-primary-foreground"></i>
            </div>
            <div>
              <h2 className="font-bold text-lg">TimesheetPro</h2>
              <p className="text-xs text-muted-foreground">Track your time</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.path;
            return (
              <Link key={item.path} href={item.path}>
                <a
                  className={`flex items-center gap-3 px-4 py-3 rounded-md font-medium transition ${
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                  onClick={() => setIsOpen(false)}
                  data-testid={`link-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <i className={`fas fa-${item.icon} w-5`}></i>
                  <span>{item.label}</span>
                </a>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
              <span data-testid="text-user-initials">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate" data-testid="text-user-name">
                {user?.firstName && user?.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user?.email || "User"}
              </p>
              <p className="text-xs text-muted-foreground truncate" data-testid="text-user-email">
                {user?.email || ""}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground transition"
              title="Logout"
              data-testid="button-logout"
            >
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </div>
      </aside>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        ></div>
      )}
    </>
  );
}
