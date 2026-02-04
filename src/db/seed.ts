import { db } from '@/db';
import { users } from '@/db/schema';
import { hash } from 'bcryptjs';

export async function seedDatabase() {
  const [existing] = await db.select().from(users).limit(1);
  if (existing) return;

  const hashedPassword = await hash('password', 12);
  await db.insert(users).values({
    id: 'seed-admin',
    name: 'Admin',
    email: 'test@example.com',
    password: hashedPassword,
    isAdmin: true,
  });
}
