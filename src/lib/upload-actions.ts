"use server";

import crypto from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { timesheetEntries } from "@/db/schema";
import { ocrReviewSchema } from "@/lib/schemas";
import { recalculateLieuLedgerForUser } from "@/lib/timesheet";
import { runOcrStub } from "@/lib/ocr";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function stubOcrFromImage(formData: FormData) {
  void formData;
  return runOcrStub();
}

export async function importOcrReview(input: unknown) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  const payload = ocrReviewSchema.parse(input);
  const userId = session.user.id;

  await db.transaction(async (tx) => {
    for (const row of payload.rows) {
      for (let idx = 0; idx < 7; idx += 1) {
        const hours = row.hours[idx];
        if (!Number.isFinite(hours) || hours <= 0) {
          continue;
        }
        const date = payload.weekStartDate + idx * DAY_MS;
        const baseWhere = and(
          eq(timesheetEntries.userId, userId),
          eq(timesheetEntries.date, new Date(date)),
          row.projectId == null
            ? isNull(timesheetEntries.projectId)
            : eq(timesheetEntries.projectId, row.projectId),
          row.taskId == null
            ? isNull(timesheetEntries.taskId)
            : eq(timesheetEntries.taskId, row.taskId),
          row.roleId == null
            ? isNull(timesheetEntries.roleId)
            : eq(timesheetEntries.roleId, row.roleId),
          eq(timesheetEntries.entryType, row.entryType ?? "Work")
        );

        const [existing] = await tx
          .select({ id: timesheetEntries.id })
          .from(timesheetEntries)
          .where(baseWhere)
          .limit(1);

        if (existing) {
          await tx
            .update(timesheetEntries)
            .set({ hours, status: "Draft" })
            .where(eq(timesheetEntries.id, existing.id));
        } else {
          await tx.insert(timesheetEntries).values({
            id: crypto.randomUUID(),
            date: new Date(date),
            hours,
            description: "Imported from screenshot",
            projectId: row.projectId ?? null,
            taskId: row.taskId ?? null,
            roleId: row.roleId ?? null,
            entryType: row.entryType ?? "Work",
            status: "Draft",
            userId,
          });
        }
      }
    }
  });

  await recalculateLieuLedgerForUser(userId);
  revalidatePath("/entries");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  revalidatePath("/reports");
}
