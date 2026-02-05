import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { generateNotificationsForUser } from "@/lib/notifications";

export async function POST(request: Request) {
  const secret = process.env.NOTIFICATIONS_CRON_SECRET;
  if (secret) {
    const header = request.headers.get("x-cron-secret");
    if (header !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const allUsers = await db.select({ id: users.id }).from(users);
  for (const user of allUsers) {
    await generateNotificationsForUser(user.id);
  }
  return NextResponse.json({ success: true });
}
