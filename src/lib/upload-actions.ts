"use server";

import { revalidatePath } from "next/cache";
import { processImage } from "@/lib/ocr";
import { db } from "@/db";
import { timesheetEntries, lieuLedger, config } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { recalculateLieuLedgerForUser } from "@/lib/timesheet";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function stubOcrFromImage(formData: FormData) {
  const file = formData.get("file") as File;
  if (!file) {
    throw new Error("No file uploaded");
  }

  // Call the OCR service (simulated or real)
  const ocrResult = await processImage(file);

  // In a real app, we might infer the week start from the image text.
  // For now, default to the current week's start.
  const now = new Date();
  const day = now.getUTCDay();
  const weekStartDate = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - day
  );

  return {
    weekStartDate,
    rows: ocrResult.data,
  };
}

type ReviewRow = {
  projectId: string | null;
  taskId: string | null;
  roleId: string | null;
  entryType: "Work" | "Admin";
  hours: number[];
};

type ReviewData = {
  weekStartDate: number;
  rows: ReviewRow[];
};

export async function importOcrReview(data: ReviewData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  const userId = session.user.id;

  const { weekStartDate, rows } = data;
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  const entriesToInsert: (typeof timesheetEntries.$inferInsert)[] = [];

  for (const row of rows) {
    if (!row.projectId) continue; // Skip rows without project

    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const hours = row.hours[dayIndex];
      if (hours > 0) {
        const date = weekStartDate + dayIndex * ONE_DAY_MS;
        entriesToInsert.push({
          id: crypto.randomUUID(),
          userId,
          date: new Date(date), // FIX: Ensure Date object
          hours,
          projectId: row.projectId,
          taskId: row.taskId,
          roleId: row.roleId,
          entryType: row.entryType,
          status: "Draft",
          description: "Imported from screenshot",
        });
      }
    }
  }

  if (entriesToInsert.length > 0) {
    await db.insert(timesheetEntries).values(entriesToInsert);
    await recalculateLieuLedgerForUser(userId);
    revalidatePath("/entries");
    revalidatePath("/dashboard");
  }
}
