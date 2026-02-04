import { db } from '@/db';
import { config, projectTasks, projects, roles, users } from '@/db/schema';
import { hash } from 'bcryptjs';

export async function seedDatabase() {
  const [existingUser] = await db.select().from(users).limit(1);
  if (!existingUser) {
    const hashedPassword = await hash('password', 12);
    await db.insert(users).values({
      id: 'seed-admin',
      name: 'Admin',
      email: 'test@example.com',
      password: hashedPassword,
      isAdmin: true,
    });
  }

  const [existingConfig] = await db.select().from(config).limit(1);
  if (!existingConfig) {
    await db.insert(config).values({
      key: 'weekly_threshold_hours',
      value: 40,
    });
  }

  const [existingRole] = await db.select().from(roles).limit(1);
  if (!existingRole) {
    await db.insert(roles).values([
      { id: 'role-server', name: 'Server' },
      { id: 'role-team-member', name: 'Team Member' },
      { id: 'role-ops-support', name: 'Operational Support' },
    ]);
  }

  const [existingProject] = await db.select().from(projects).limit(1);
  if (!existingProject) {
    await db.insert(projects).values([
      {
        id: 'project-u-ops',
        name: 'Unified Operations',
        code: 'U-OPS',
        clientName: 'Contoso',
        isActive: true,
      },
      {
        id: 'project-lvc-igs-inf',
        name: 'Infrastructure',
        code: 'LVC-IGS-INF',
        clientName: 'Fabrikam',
        isActive: true,
      },
    ]);
  }

  const [existingTask] = await db.select().from(projectTasks).limit(1);
  if (!existingTask) {
    await db.insert(projectTasks).values([
      {
        id: 'task-u-ops-maint',
        projectId: 'project-u-ops',
        name: 'Maintenance',
        code: 'MAINT',
      },
      {
        id: 'task-u-ops-admin',
        projectId: 'project-u-ops',
        name: 'Administration',
        code: 'ADMIN',
      },
      {
        id: 'task-lvc-ops',
        projectId: 'project-lvc-igs-inf',
        name: 'Operations',
        code: 'OPS',
      },
    ]);
  }
}
