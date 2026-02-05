"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { recalculateLieuLedgerForUser } from "@/lib/timesheet";

/**
 * Get all users (admin only)
 */
export async function getAllUsers() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return [];
  }

  // Check if user is admin
  const [currentUser] = await db
    .select({ isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!currentUser?.isAdmin) {
    return [];
  }

  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      isAdmin: users.isAdmin,
      initialLieuBalance: users.initialLieuBalance,
    })
    .from(users);

  return allUsers;
}

/**
 * Update a user's initial lieu balance (admin only)
 */
export async function updateUserInitialBalance(
  userId: string,
  initialLieuBalance: number
): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  // Check if current user is admin
  const [currentUser] = await db
    .select({ isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!currentUser?.isAdmin) {
    return { success: false, error: "Admin access required" };
  }

  // Update the user's initial balance
  await db
    .update(users)
    .set({ initialLieuBalance: Number(initialLieuBalance.toFixed(2)) })
    .where(eq(users.id, userId));

  // Recalculate their lieu ledger
  await recalculateLieuLedgerForUser(userId);

  revalidatePath("/admin");
  revalidatePath("/dashboard");

  return { success: true };
}
