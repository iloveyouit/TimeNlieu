"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { generateNotificationsForUser } from "@/lib/notifications";

export async function refreshNotifications() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false };
  }
  await generateNotificationsForUser(session.user.id);
  return { success: true };
}

export async function getNotifications() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { notifications: [], unreadCount: 0 };
  }
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, session.user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(10);
  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, session.user.id), eq(notifications.isRead, false)));
  return { notifications: rows, unreadCount: countRow?.count ?? 0 };
}

export async function markAllNotificationsRead() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false };
  }
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.userId, session.user.id));
  return { success: true };
}
