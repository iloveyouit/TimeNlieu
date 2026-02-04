import { z } from "zod";

export const markNotificationReadSchema = z.object({
  notificationId: z.string(),
});

export const weekDataSchema = z.object({
  weekStartDate: z.number(),
});

const nullableId = z.string().nullable().optional();

export const upsertTimesheetEntrySchema = z.object({
  date: z.number(),
  hours: z.number(),
  projectId: nullableId,
  taskId: nullableId,
  roleId: nullableId,
  entryType: z.enum(["Work", "Admin"]).default("Work"),
  status: z
    .enum(["Draft", "Submitted", "Approved", "Recalled"])
    .optional()
    .default("Draft"),
});

export const updateRowMetaSchema = z.object({
  weekStartDate: z.number(),
  previous: z.object({
    projectId: nullableId,
    taskId: nullableId,
    roleId: nullableId,
    entryType: z.enum(["Work", "Admin"]),
  }),
  next: z.object({
    projectId: nullableId,
    taskId: nullableId,
    roleId: nullableId,
    entryType: z.enum(["Work", "Admin"]),
  }),
});

export const deleteRowSchema = z.object({
  weekStartDate: z.number(),
  row: z.object({
    projectId: nullableId,
    taskId: nullableId,
    roleId: nullableId,
    entryType: z.enum(["Work", "Admin"]),
  }),
});

export const submitWeekSchema = z.object({
  weekStartDate: z.number(),
});

export const monthDataSchema = z.object({
  monthStartDate: z.number(),
});
