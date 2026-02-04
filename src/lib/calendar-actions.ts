"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { monthDataSchema } from "@/lib/schemas";
import { getMonthDataForUser } from "@/lib/calendar";

export async function getMonthData(input: unknown) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  const { monthStartDate } = monthDataSchema.parse(input);
  return getMonthDataForUser(session.user.id, monthStartDate);
}
