"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ocrReviewSchema } from "@/lib/schemas";
import { db } from "@/db";
import { timesheetEntries } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import crypto from "crypto";
import { recalculateLieuLedgerForUser, startOfWeekUtc, weekRangeUtc } from "@/lib/timesheet";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function stubOcrFromImage(formData: FormData) {
  void formData;
  const weekStartDate = startOfWeekUtc(Date.now());
  return {
    weekStartDate,
    rows: [
      {
        projectId: null,
        taskId: null,
        roleId: null,
        entryType: "Work",
        hours: [0, 0, 0, 0, 0, 0, 0],
      },
    ],
  };
}

export async function importOcrReview(input: unknown) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
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
          eq(timesheetEntries.date, date),
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
            date,
            hours,
            description: null,
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

  const { start, end } = weekRangeUtc(payload.weekStartDate);
  return { success: true, start, end };
}
