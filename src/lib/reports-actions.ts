"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { buildCsv, getReportDataForUser, ReportFilters } from "@/lib/reports";
import { z } from "zod";

const reportFilterSchema = z.object({
  startDate: z.number(),
  endDate: z.number(),
  status: z.enum(["All", "Draft", "Submitted", "Approved", "Recalled"]),
  projectId: z.string(),
});

export async function getReportData(input: unknown) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  const filters = reportFilterSchema.parse(input) as ReportFilters;
  return getReportDataForUser(session.user.id, filters);
}

export async function exportReportCsv(input: unknown) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  const filters = reportFilterSchema.parse(input) as ReportFilters;
  const data = await getReportDataForUser(session.user.id, filters);
  return buildCsv(data.weeklyRows);
}
