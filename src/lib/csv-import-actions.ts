"use server";

import crypto from "crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { timesheetEntries } from "@/db/schema";
import { recalculateLieuLedgerForUser } from "@/lib/timesheet";
import type { ParsedEntry } from "@/lib/csv-excel-parser";

export type ImportResult = {
  success: boolean;
  importedCount: number;
  skippedCount: number;
  errors: string[];
};

/**
 * Import parsed timesheet entries into the database
 */
export async function importTimesheetEntries(
  entries: ParsedEntry[]
): Promise<ImportResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      success: false,
      importedCount: 0,
      skippedCount: 0,
      errors: ["Unauthorized - please log in"],
    };
  }

  const userId = session.user.id;
  const errors: string[] = [];
  let importedCount = 0;
  let skippedCount = 0;

  await db.transaction(async (tx) => {
    for (const entry of entries) {
      try {
        // Check for existing entry on the same date
        const [existing] = await tx
          .select({ id: timesheetEntries.id })
          .from(timesheetEntries)
          .where(eq(timesheetEntries.date, entry.date))
          .limit(1);

        if (existing) {
          // Update existing entry
          await tx
            .update(timesheetEntries)
            .set({ hours: entry.hours, status: "Draft" })
            .where(eq(timesheetEntries.id, existing.id));
          importedCount++;
        } else {
          // Insert new entry
          await tx.insert(timesheetEntries).values({
            id: crypto.randomUUID(),
            date: entry.date,
            hours: entry.hours,
            description: "Imported from file",
            projectId: null,
            taskId: null,
            roleId: null,
            entryType: "Work",
            status: "Draft",
            userId,
          });
          importedCount++;
        }
      } catch (err) {
        const dateStr = entry.date.toISOString().split("T")[0];
        errors.push(`Failed to import entry for ${dateStr}: ${err instanceof Error ? err.message : "Unknown error"}`);
        skippedCount++;
      }
    }
  });

  // Recalculate lieu ledger after import
  await recalculateLieuLedgerForUser(userId);

  // Revalidate relevant paths
  revalidatePath("/entries");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  revalidatePath("/reports");

  return {
    success: errors.length === 0,
    importedCount,
    skippedCount,
    errors,
  };
}
