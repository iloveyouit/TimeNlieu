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
  hours: z
    .number()
    .min(0)
    .max(24)
    .refine((value) => Math.round(value * 100) / 100 === value, {
      message: "Hours must have at most 2 decimal places.",
    }),
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

export const ocrReviewSchema = z.object({
  weekStartDate: z.number(),
  rows: z.array(
    z.object({
      projectId: z.string().nullable().optional(),
      taskId: z.string().nullable().optional(),
      roleId: z.string().nullable().optional(),
      entryType: z.enum(["Work", "Admin"]).default("Work"),
      hours: z.array(
        z
          .number()
          .min(0)
          .max(24)
          .refine((value) => Math.round(value * 100) / 100 === value, {
            message: "Hours must have at most 2 decimal places.",
          })
      ),
    })
  ),
});

export const adminProjectSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  code: z.string().min(1),
  clientName: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const adminTaskSchema = z.object({
  id: z.string().optional(),
  projectId: z.string().min(1),
  name: z.string().min(1),
  code: z.string().optional().nullable(),
});

export const adminRoleSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
});
