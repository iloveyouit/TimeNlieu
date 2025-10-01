import {
  users,
  timesheetEntries,
  weeklySummaries,
  notifications,
  type User,
  type UpsertUser,
  type TimesheetEntry,
  type InsertTimesheetEntry,
  type WeeklySummary,
  type InsertWeeklySummary,
  type Notification,
  type InsertNotification,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Timesheet entry operations
  createTimesheetEntry(entry: InsertTimesheetEntry): Promise<TimesheetEntry>;
  getTimesheetEntry(id: string): Promise<TimesheetEntry | undefined>;
  getTimesheetEntriesByUser(userId: string): Promise<TimesheetEntry[]>;
  getTimesheetEntriesByDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<TimesheetEntry[]>;
  updateTimesheetEntry(
    id: string,
    entry: Partial<InsertTimesheetEntry>
  ): Promise<TimesheetEntry>;
  deleteTimesheetEntry(id: string): Promise<void>;

  // Weekly summary operations
  createWeeklySummary(summary: InsertWeeklySummary): Promise<WeeklySummary>;
  getWeeklySummary(
    userId: string,
    weekStartDate: string
  ): Promise<WeeklySummary | undefined>;
  getWeeklySummariesByUser(userId: string): Promise<WeeklySummary[]>;
  updateWeeklySummary(
    id: string,
    summary: Partial<InsertWeeklySummary>
  ): Promise<WeeklySummary>;

  // Dashboard statistics
  getDashboardStats(userId: string): Promise<{
    lieuBalance: number;
    thisWeekHours: number;
    totalEntries: number;
    avgWeeklyHours: number;
  }>;

  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  getUnreadNotificationsByUser(userId: string): Promise<Notification[]>;
  markNotificationAsRead(id: string): Promise<Notification>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  deleteNotification(id: string): Promise<void>;

  // Admin operations
  getAllUsers(): Promise<User[]>;
  updateUserAdminStatus(userId: string, isAdmin: boolean): Promise<User>;
  getUserStats(userId: string): Promise<{
    totalEntries: number;
    totalHours: number;
    lieuBalance: number;
    lastEntryDate: string | null;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async createTimesheetEntry(
    entry: InsertTimesheetEntry
  ): Promise<TimesheetEntry> {
    const [created] = await db
      .insert(timesheetEntries)
      .values(entry)
      .returning();
    return created;
  }

  async getTimesheetEntry(id: string): Promise<TimesheetEntry | undefined> {
    const [entry] = await db
      .select()
      .from(timesheetEntries)
      .where(eq(timesheetEntries.id, id));
    return entry;
  }

  async getTimesheetEntriesByUser(userId: string): Promise<TimesheetEntry[]> {
    return await db
      .select()
      .from(timesheetEntries)
      .where(eq(timesheetEntries.userId, userId))
      .orderBy(desc(timesheetEntries.date));
  }

  async getTimesheetEntriesByDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<TimesheetEntry[]> {
    return await db
      .select()
      .from(timesheetEntries)
      .where(
        and(
          eq(timesheetEntries.userId, userId),
          gte(timesheetEntries.date, startDate),
          lte(timesheetEntries.date, endDate)
        )
      )
      .orderBy(desc(timesheetEntries.date));
  }

  async updateTimesheetEntry(
    id: string,
    entry: Partial<InsertTimesheetEntry>
  ): Promise<TimesheetEntry> {
    const [updated] = await db
      .update(timesheetEntries)
      .set({ ...entry, updatedAt: new Date() })
      .where(eq(timesheetEntries.id, id))
      .returning();
    return updated;
  }

  async deleteTimesheetEntry(id: string): Promise<void> {
    await db.delete(timesheetEntries).where(eq(timesheetEntries.id, id));
  }

  async createWeeklySummary(
    summary: InsertWeeklySummary
  ): Promise<WeeklySummary> {
    const [created] = await db
      .insert(weeklySummaries)
      .values(summary)
      .returning();
    return created;
  }

  async getWeeklySummary(
    userId: string,
    weekStartDate: string
  ): Promise<WeeklySummary | undefined> {
    const [summary] = await db
      .select()
      .from(weeklySummaries)
      .where(
        and(
          eq(weeklySummaries.userId, userId),
          eq(weeklySummaries.weekStartDate, weekStartDate)
        )
      );
    return summary;
  }

  async getWeeklySummariesByUser(userId: string): Promise<WeeklySummary[]> {
    return await db
      .select()
      .from(weeklySummaries)
      .where(eq(weeklySummaries.userId, userId))
      .orderBy(desc(weeklySummaries.weekStartDate));
  }

  async updateWeeklySummary(
    id: string,
    summary: Partial<InsertWeeklySummary>
  ): Promise<WeeklySummary> {
    const [updated] = await db
      .update(weeklySummaries)
      .set({ ...summary, updatedAt: new Date() })
      .where(eq(weeklySummaries.id, id))
      .returning();
    return updated;
  }

  async getDashboardStats(userId: string): Promise<{
    lieuBalance: number;
    thisWeekHours: number;
    totalEntries: number;
    avgWeeklyHours: number;
  }> {
    // Get current week dates
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const weekStartStr = weekStart.toISOString().split("T")[0];
    const weekEndStr = weekEnd.toISOString().split("T")[0];

    // Get this week's entries
    const thisWeekEntries = await this.getTimesheetEntriesByDateRange(
      userId,
      weekStartStr,
      weekEndStr
    );

    const thisWeekHours = thisWeekEntries.reduce(
      (sum, entry) => sum + parseFloat(entry.hours),
      0
    );

    // Get total entries count
    const allEntries = await this.getTimesheetEntriesByUser(userId);
    const totalEntries = allEntries.length;

    // Get last 4 weeks summaries for average
    const summaries = await db
      .select()
      .from(weeklySummaries)
      .where(eq(weeklySummaries.userId, userId))
      .orderBy(desc(weeklySummaries.weekStartDate))
      .limit(4);

    const avgWeeklyHours =
      summaries.length > 0
        ? summaries.reduce((sum, s) => sum + parseFloat(s.totalHours), 0) /
          summaries.length
        : 0;

    // Get current lieu balance from most recent summary
    const [latestSummary] = await db
      .select()
      .from(weeklySummaries)
      .where(eq(weeklySummaries.userId, userId))
      .orderBy(desc(weeklySummaries.weekStartDate))
      .limit(1);

    const lieuBalance = latestSummary
      ? parseFloat(latestSummary.lieuBalance)
      : 0;

    return {
      lieuBalance,
      thisWeekHours,
      totalEntries,
      avgWeeklyHours,
    };
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    return created;
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotificationsByUser(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        )
      )
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(id: string): Promise<Notification> {
    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    return updated;
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }

  async deleteNotification(id: string): Promise<void> {
    await db.delete(notifications).where(eq(notifications.id, id));
  }

  async getAllUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));
  }

  async updateUserAdminStatus(userId: string, isAdmin: boolean): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ isAdmin, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async getUserStats(userId: string): Promise<{
    totalEntries: number;
    totalHours: number;
    lieuBalance: number;
    lastEntryDate: string | null;
  }> {
    const entries = await this.getTimesheetEntriesByUser(userId);
    const totalEntries = entries.length;
    const totalHours = entries.reduce(
      (sum, entry) => sum + parseFloat(entry.hours),
      0
    );

    const [latestSummary] = await db
      .select()
      .from(weeklySummaries)
      .where(eq(weeklySummaries.userId, userId))
      .orderBy(desc(weeklySummaries.weekStartDate))
      .limit(1);

    const lieuBalance = latestSummary
      ? parseFloat(latestSummary.lieuBalance)
      : 0;

    const lastEntryDate = entries.length > 0 ? entries[0].date : null;

    return {
      totalEntries,
      totalHours,
      lieuBalance,
      lastEntryDate,
    };
  }
}

export const storage = new DatabaseStorage();
