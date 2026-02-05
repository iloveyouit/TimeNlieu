"use server";

import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import crypto from "crypto";
import { and, eq, gte, lt, isNull } from "drizzle-orm";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { timesheetEntries } from "@/db/schema";
import {
  deleteRowSchema,
  submitWeekSchema,
  updateRowMetaSchema,
  upsertTimesheetEntrySchema,
  weekDataSchema,
} from "@/lib/schemas";
import {
  getWeekDataForUser,
  recalculateLieuLedgerForUser,
  weekRangeUtc,
} from "@/lib/timesheet";

function requireUserId(session: Session | null) {
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  return session.user.id;
}

function rowWhere(
  row: {
    projectId?: string | null;
    taskId?: string | null;
    roleId?: string | null;
    entryType?: string | null;
  },
  userId: string
) {
  return and(
    eq(timesheetEntries.userId, userId),
    row.projectId == null
      ? isNull(timesheetEntries.projectId)
      : eq(timesheetEntries.projectId, row.projectId),
    row.taskId == null
      ? isNull(timesheetEntries.taskId)
      : eq(timesheetEntries.taskId, row.taskId),
    row.roleId == null
      ? isNull(timesheetEntries.roleId)
      : eq(timesheetEntries.roleId, row.roleId),
    row.entryType == null
      ? eq(timesheetEntries.entryType, "Work")
      : eq(timesheetEntries.entryType, row.entryType)
  );
}

export async function getWeekData(input: unknown) {
  const session = await getServerSession(authOptions);
  const userId = requireUserId(session);
  const { weekStartDate } = weekDataSchema.parse(input);
  return getWeekDataForUser(userId, weekStartDate);
}

export async function upsertTimesheetEntry(input: unknown) {
  const session = await getServerSession(authOptions);
  const userId = requireUserId(session);
  const payload = upsertTimesheetEntrySchema.parse(input);

  const date = payload.date;
  const hours = Number(payload.hours);

  const baseWhere = and(
    eq(timesheetEntries.userId, userId),
    eq(timesheetEntries.date, new Date(date)),
    payload.projectId == null
      ? isNull(timesheetEntries.projectId)
      : eq(timesheetEntries.projectId, payload.projectId),
    payload.taskId == null
      ? isNull(timesheetEntries.taskId)
      : eq(timesheetEntries.taskId, payload.taskId),
    payload.roleId == null
      ? isNull(timesheetEntries.roleId)
      : eq(timesheetEntries.roleId, payload.roleId),
    eq(timesheetEntries.entryType, payload.entryType)
  );

  const [existing] = await db
    .select({ id: timesheetEntries.id, status: timesheetEntries.status })
    .from(timesheetEntries)
    .where(baseWhere)
    .limit(1);

  if (!Number.isFinite(hours) || hours <= 0) {
    if (existing && existing.status !== "Draft") {
      return { error: "Entry is locked." };
    }
    await db.delete(timesheetEntries).where(baseWhere);
    await recalculateLieuLedgerForUser(userId);
    return { deleted: true };
  }

  if (existing) {
    if (existing.status !== "Draft") {
      return { error: "Entry is locked." };
    }
    await db
      .update(timesheetEntries)
      .set({ hours, status: payload.status ?? "Draft" })
      .where(eq(timesheetEntries.id, existing.id));
    await recalculateLieuLedgerForUser(userId);
    return { entryId: existing.id };
  }

  const entryId = crypto.randomUUID();
  await db.insert(timesheetEntries).values({
    id: entryId,
    date: new Date(date),
    hours,
    description: null,
    projectId: payload.projectId ?? null,
    taskId: payload.taskId ?? null,
    roleId: payload.roleId ?? null,
    entryType: payload.entryType,
    status: payload.status ?? "Draft",
    userId,
  });
  await recalculateLieuLedgerForUser(userId);
  return { entryId };
}

export async function updateWeekRowMeta(input: unknown) {
  const session = await getServerSession(authOptions);
  const userId = requireUserId(session);
  const payload = updateRowMetaSchema.parse(input);
  const { start, end } = weekRangeUtc(payload.weekStartDate);

  await db
    .update(timesheetEntries)
    .set({
      projectId: payload.next.projectId ?? null,
      taskId: payload.next.taskId ?? null,
      roleId: payload.next.roleId ?? null,
      entryType: payload.next.entryType,
    })
    .where(
      and(
        rowWhere(payload.previous, userId),
        gte(timesheetEntries.date, new Date(start)),
        lt(timesheetEntries.date, new Date(end)),
        eq(timesheetEntries.status, "Draft")
      )
    );
}

export async function deleteWeekRow(input: unknown) {
  const session = await getServerSession(authOptions);
  const userId = requireUserId(session);
  const payload = deleteRowSchema.parse(input);
  const { start, end } = weekRangeUtc(payload.weekStartDate);

  await db
    .delete(timesheetEntries)
    .where(
      and(
        rowWhere(payload.row, userId),
        gte(timesheetEntries.date, new Date(start)),
        lt(timesheetEntries.date, new Date(end)),
        eq(timesheetEntries.status, "Draft")
      )
    );
  await recalculateLieuLedgerForUser(userId);
}

export async function submitWeek(input: unknown) {
  const session = await getServerSession(authOptions);
  const userId = requireUserId(session);
  const payload = submitWeekSchema.parse(input);
  const { start, end } = weekRangeUtc(payload.weekStartDate);

  await db
    .update(timesheetEntries)
    .set({ status: "Submitted" })
    .where(
      and(
        eq(timesheetEntries.userId, userId),
        gte(timesheetEntries.date, new Date(start)),
        lt(timesheetEntries.date, new Date(end)),
        eq(timesheetEntries.status, "Draft")
      )
    );
}
