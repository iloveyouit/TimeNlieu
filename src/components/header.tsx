"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut, useSession } from "next-auth/react";
import {
  getNotifications,
  markAllNotificationsRead,
  refreshNotifications,
} from "@/lib/notifications-actions";
import { markNotificationRead } from "@/lib/actions";

type NotificationRow = {
  id: string;
  title: string;
  message: string;
  isRead: boolean | null;
};

export function Header() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = async () => {
    const data = await getNotifications();
    setNotifications(data.notifications as NotificationRow[]);
    setUnreadCount(data.unreadCount);
  };

  useEffect(() => {
    refreshNotifications().then(loadNotifications);
  }, []);

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
      <div>
        <h1 className="text-lg font-semibold">TimeNlieu</h1>
      </div>
      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 ? (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs text-white">
                  {unreadCount}
                </span>
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              Notifications
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await markAllNotificationsRead();
                  loadNotifications();
                }}
              >
                Mark all read
              </Button>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <DropdownMenuItem disabled>No notifications yet.</DropdownMenuItem>
            ) : (
              notifications.map((note) => (
                <DropdownMenuItem
                  key={note.id}
                  className="flex flex-col items-start gap-1"
                  onClick={async () => {
                    if (!note.isRead) {
                      await markNotificationRead({ notificationId: note.id });
                      loadNotifications();
                    }
                  }}
                >
                  <span className="font-medium">{note.title}</span>
                  <span className="text-xs text-muted-foreground">{note.message}</span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar>
                <AvatarImage src={session?.user?.image ?? undefined} />
                <AvatarFallback>{session?.user?.name?.[0]}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem>Support</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()}>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
