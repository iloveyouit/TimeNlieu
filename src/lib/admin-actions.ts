"use server";

import crypto from "crypto";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { projectTasks, projects, roles, users } from "@/db/schema";
import { adminProjectSchema, adminRoleSchema, adminTaskSchema } from "@/lib/schemas";
import { asc, eq } from "drizzle-orm";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  const [user] = await db
    .select({ isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  if (!user?.isAdmin) {
    throw new Error("Forbidden");
  }
  return session.user.id;
}

export async function getAdminData() {
  await requireAdmin();
  const [projectsList, tasksList, rolesList] = await Promise.all([
    db.select().from(projects).orderBy(asc(projects.name)),
    db.select().from(projectTasks).orderBy(asc(projectTasks.name)),
    db.select().from(roles).orderBy(asc(roles.name)),
  ]);
  return { projects: projectsList, projectTasks: tasksList, roles: rolesList };
}

export async function upsertProject(input: unknown) {
  await requireAdmin();
  const payload = adminProjectSchema.parse(input);
  if (payload.id) {
    await db
      .update(projects)
      .set({
        name: payload.name,
        code: payload.code,
        clientName: payload.clientName ?? null,
        isActive: payload.isActive ?? true,
      })
      .where(eq(projects.id, payload.id));
    return payload.id;
  }
  const id = crypto.randomUUID();
  await db.insert(projects).values({
    id,
    name: payload.name,
    code: payload.code,
    clientName: payload.clientName ?? null,
    isActive: payload.isActive ?? true,
  });
  return id;
}

export async function deleteProject(projectId: string) {
  await requireAdmin();
  await db.delete(projects).where(eq(projects.id, projectId));
}

export async function upsertProjectTask(input: unknown) {
  await requireAdmin();
  const payload = adminTaskSchema.parse(input);
  if (payload.id) {
    await db
      .update(projectTasks)
      .set({
        projectId: payload.projectId,
        name: payload.name,
        code: payload.code ?? null,
      })
      .where(eq(projectTasks.id, payload.id));
    return payload.id;
  }
  const id = crypto.randomUUID();
  await db.insert(projectTasks).values({
    id,
    projectId: payload.projectId,
    name: payload.name,
    code: payload.code ?? null,
  });
  return id;
}

export async function deleteProjectTask(taskId: string) {
  await requireAdmin();
  await db.delete(projectTasks).where(eq(projectTasks.id, taskId));
}

export async function upsertRole(input: unknown) {
  await requireAdmin();
  const payload = adminRoleSchema.parse(input);
  if (payload.id) {
    await db.update(roles).set({ name: payload.name }).where(eq(roles.id, payload.id));
    return payload.id;
  }
  const id = crypto.randomUUID();
  await db.insert(roles).values({ id, name: payload.name });
  return id;
}

export async function deleteRole(roleId: string) {
  await requireAdmin();
  await db.delete(roles).where(eq(roles.id, roleId));
}
