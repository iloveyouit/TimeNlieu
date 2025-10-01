import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { isAdmin } from "./adminMiddleware";
import { insertTimesheetEntrySchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import multer from "multer";
import { processImageWithOCR } from "./ocr";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // OCR Upload endpoint
  app.post(
    "/api/upload/ocr",
    isAuthenticated,
    upload.single("screenshot"),
    async (req: any, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        const entries = await processImageWithOCR(req.file.buffer);
        res.json({ entries });
      } catch (error) {
        console.error("Error processing OCR:", error);
        res.status(500).json({ message: "Failed to process image" });
      }
    }
  );

  // Timesheet entry routes
  app.get("/api/timesheet-entries", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const entries = await storage.getTimesheetEntriesByUser(userId);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching timesheet entries:", error);
      res.status(500).json({ message: "Failed to fetch timesheet entries" });
    }
  });

  app.get(
    "/api/timesheet-entries/:id",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { id } = req.params;
        const entry = await storage.getTimesheetEntry(id);
        if (!entry) {
          return res.status(404).json({ message: "Entry not found" });
        }
        // Verify ownership
        if (entry.userId !== req.user.claims.sub) {
          return res.status(403).json({ message: "Forbidden" });
        }
        res.json(entry);
      } catch (error) {
        console.error("Error fetching timesheet entry:", error);
        res.status(500).json({ message: "Failed to fetch timesheet entry" });
      }
    }
  );

  app.post("/api/timesheet-entries", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validation = insertTimesheetEntrySchema.safeParse({
        ...req.body,
        userId,
      });

      if (!validation.success) {
        const errorMessage = fromZodError(validation.error).toString();
        return res.status(400).json({ message: errorMessage });
      }

      const entry = await storage.createTimesheetEntry(validation.data);

      // Update weekly summary
      await updateWeeklySummary(userId, entry.date);

      res.status(201).json(entry);
    } catch (error) {
      console.error("Error creating timesheet entry:", error);
      res.status(500).json({ message: "Failed to create timesheet entry" });
    }
  });

  app.post(
    "/api/timesheet-entries/bulk",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const { entries } = req.body;

        if (!Array.isArray(entries)) {
          return res.status(400).json({ message: "Entries must be an array" });
        }

        const createdEntries = [];
        for (const entryData of entries) {
          const validation = insertTimesheetEntrySchema.safeParse({
            ...entryData,
            userId,
          });

          if (!validation.success) {
            const errorMessage = fromZodError(validation.error).toString();
            return res.status(400).json({ message: errorMessage });
          }

          const entry = await storage.createTimesheetEntry(validation.data);
          createdEntries.push(entry);
        }

        // Update weekly summaries for all affected weeks
        const dates = entries.map((e: any) => e.date);
        const uniqueDates = Array.from(new Set(dates));
        for (const date of uniqueDates) {
          await updateWeeklySummary(userId, date);
        }

        res.status(201).json(createdEntries);
      } catch (error) {
        console.error("Error creating bulk timesheet entries:", error);
        res
          .status(500)
          .json({ message: "Failed to create bulk timesheet entries" });
      }
    }
  );

  app.put(
    "/api/timesheet-entries/:id",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { id } = req.params;
        const userId = req.user.claims.sub;

        const existingEntry = await storage.getTimesheetEntry(id);
        if (!existingEntry) {
          return res.status(404).json({ message: "Entry not found" });
        }

        // Verify ownership
        if (existingEntry.userId !== userId) {
          return res.status(403).json({ message: "Forbidden" });
        }

        const entry = await storage.updateTimesheetEntry(id, req.body);

        // Update weekly summary
        await updateWeeklySummary(userId, entry.date);

        res.json(entry);
      } catch (error) {
        console.error("Error updating timesheet entry:", error);
        res.status(500).json({ message: "Failed to update timesheet entry" });
      }
    }
  );

  app.delete(
    "/api/timesheet-entries/:id",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { id } = req.params;
        const userId = req.user.claims.sub;

        const existingEntry = await storage.getTimesheetEntry(id);
        if (!existingEntry) {
          return res.status(404).json({ message: "Entry not found" });
        }

        // Verify ownership
        if (existingEntry.userId !== userId) {
          return res.status(403).json({ message: "Forbidden" });
        }

        const entryDate = existingEntry.date;
        await storage.deleteTimesheetEntry(id);

        // Update weekly summary
        await updateWeeklySummary(userId, entryDate);

        res.status(204).send();
      } catch (error) {
        console.error("Error deleting timesheet entry:", error);
        res.status(500).json({ message: "Failed to delete timesheet entry" });
      }
    }
  );

  // Weekly summaries routes
  app.get("/api/weekly-summaries", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const summaries = await storage.getWeeklySummariesByUser(userId);
      res.json(summaries);
    } catch (error) {
      console.error("Error fetching weekly summaries:", error);
      res.status(500).json({ message: "Failed to fetch weekly summaries" });
    }
  });

  // Admin routes
  app.get("/api/admin/users", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/users/:userId/stats", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  app.put("/api/admin/users/:userId/admin-status", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { isAdmin } = req.body;

      if (typeof isAdmin !== "boolean") {
        return res.status(400).json({ message: "isAdmin must be a boolean" });
      }

      const user = await storage.updateUserAdminStatus(userId, isAdmin);
      res.json(user);
    } catch (error) {
      console.error("Error updating user admin status:", error);
      res.status(500).json({ message: "Failed to update admin status" });
    }
  });

  // Notification routes
  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await storage.getNotificationsByUser(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/unread", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await storage.getUnreadNotificationsByUser(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching unread notifications:", error);
      res.status(500).json({ message: "Failed to fetch unread notifications" });
    }
  });

  app.put("/api/notifications/:id/read", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // Get all user notifications to verify ownership
      const userNotifications = await storage.getNotificationsByUser(userId);
      const notification = userNotifications.find((n) => n.id === id);
      
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      const updated = await storage.markNotificationAsRead(id);
      res.json(updated);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.put("/api/notifications/mark-all-read", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.markAllNotificationsAsRead(userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  app.delete("/api/notifications/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // Get all user notifications to verify ownership
      const userNotifications = await storage.getNotificationsByUser(userId);
      const notification = userNotifications.find((n) => n.id === id);
      
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      await storage.deleteNotification(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  // Helper function to check for discrepancies and create notifications
  async function checkForDiscrepancies(userId: string, entries: any[]) {
    // Check for daily hours over 12 (potential discrepancy)
    const dailyHours = new Map<string, number>();
    for (const entry of entries) {
      const date = entry.date;
      const hours = parseFloat(entry.hours);
      dailyHours.set(date, (dailyHours.get(date) || 0) + hours);
    }

    const dailyHoursArray = Array.from(dailyHours.entries());
    for (const [date, hours] of dailyHoursArray) {
      if (hours > 12) {
        await storage.createNotification({
          userId,
          type: "hours_discrepancy",
          title: "High Daily Hours Detected",
          message: `You logged ${hours.toFixed(1)} hours on ${date}, which is unusually high. Please verify this is correct.`,
          isRead: false,
          metadata: { date, hours },
        });
      }
    }
  }

  // Helper function to update weekly summary
  async function updateWeeklySummary(userId: string, dateStr: string) {
    const date = new Date(dateStr);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const weekStartStr = weekStart.toISOString().split("T")[0];
    const weekEndStr = weekEnd.toISOString().split("T")[0];

    // Get all entries for this week
    const entries = await storage.getTimesheetEntriesByDateRange(
      userId,
      weekStartStr,
      weekEndStr
    );

    const totalHours = entries.reduce(
      (sum, entry) => sum + parseFloat(entry.hours),
      0
    );
    
    // Calculate delta from standard 40-hour week (can be negative)
    const delta = totalHours - 40;
    const overtimeHours = Math.max(0, delta);

    // Get previous week's summary to carry forward lieu balance
    const allSummaries = await storage.getWeeklySummariesByUser(userId);
    const previousWeekSummaries = allSummaries.filter(
      (s) => new Date(s.weekStartDate) < new Date(weekStartStr)
    );
    const previousBalance =
      previousWeekSummaries.length > 0
        ? parseFloat(previousWeekSummaries[0].lieuBalance)
        : 0;

    // Apply delta to balance (can go negative if under 40 hours)
    const lieuBalance = previousBalance + delta;

    // Check if summary exists
    const existingSummary = await storage.getWeeklySummary(
      userId,
      weekStartStr
    );

    const oldBalance = existingSummary ? parseFloat(existingSummary.lieuBalance) : previousBalance;
    const oldOvertime = existingSummary ? parseFloat(existingSummary.overtimeHours) : 0;

    if (existingSummary) {
      await storage.updateWeeklySummary(existingSummary.id, {
        totalHours: totalHours.toString(),
        overtimeHours: overtimeHours.toString(),
        lieuBalance: lieuBalance.toString(),
      });
    } else {
      await storage.createWeeklySummary({
        userId,
        weekStartDate: weekStartStr,
        weekEndDate: weekEndStr,
        totalHours: totalHours.toString(),
        overtimeHours: overtimeHours.toString(),
        lieuBalance: lieuBalance.toString(),
      });
    }

    // Notification logic with edge detection
    
    // 1. Negative lieu balance alert
    if (lieuBalance < 0 && oldBalance >= 0) {
      await storage.createNotification({
        userId,
        type: "hours_discrepancy",
        title: "Negative Lieu Balance",
        message: `Your lieu balance is now ${lieuBalance.toFixed(1)} hours. You have worked fewer than standard hours recently.`,
        isRead: false,
        metadata: { weekStartDate: weekStartStr, lieuBalance },
      });
    }

    // 2. Significant balance change (>= 5 hours)
    const balanceChange = lieuBalance - oldBalance;
    if (Math.abs(balanceChange) >= 5) {
      await storage.createNotification({
        userId,
        type: "lieu_update",
        title: "Lieu Balance Updated",
        message: `Your lieu balance changed by ${balanceChange > 0 ? '+' : ''}${balanceChange.toFixed(1)} hours this week. Current balance: ${lieuBalance.toFixed(1)} hours.`,
        isRead: false,
        metadata: { weekStartDate: weekStartStr, balanceChange, newBalance: lieuBalance },
      });
    }

    // 3. New overtime earned (only if overtime increased)
    if (overtimeHours > oldOvertime && overtimeHours > 0) {
      const newOvertimeEarned = overtimeHours - oldOvertime;
      await storage.createNotification({
        userId,
        type: "lieu_update",
        title: "Overtime Earned",
        message: `You earned ${newOvertimeEarned.toFixed(1)} hours of lieu time this week. New balance: ${lieuBalance.toFixed(1)} hours.`,
        isRead: false,
        metadata: { weekStartDate: weekStartStr, overtimeHours: newOvertimeEarned, lieuBalance },
      });
    }

    // 4. Milestone detection (crossing 40 hour threshold)
    if (lieuBalance >= 40 && oldBalance < 40) {
      await storage.createNotification({
        userId,
        type: "lieu_milestone",
        title: "Lieu Milestone Reached",
        message: `Congratulations! You've accumulated ${lieuBalance.toFixed(1)} hours of lieu time - equivalent to a full week off!`,
        isRead: false,
        metadata: { lieuBalance },
      });
    }

    // 5. Check for daily hour discrepancies
    await checkForDiscrepancies(userId, entries);
  }

  const httpServer = createServer(app);
  return httpServer;
}
