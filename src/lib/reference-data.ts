import { db } from "@/db";
import { projectTasks, projects, roles } from "@/db/schema";
import { asc } from "drizzle-orm";

export async function getReferenceData() {
  const [projectsList, tasksList, rolesList] = await Promise.all([
    db.select().from(projects).orderBy(asc(projects.name)),
    db.select().from(projectTasks).orderBy(asc(projectTasks.name)),
    db.select().from(roles).orderBy(asc(roles.name)),
  ]);

  return {
    projects: projectsList,
    projectTasks: tasksList,
    roles: rolesList,
  };
}
