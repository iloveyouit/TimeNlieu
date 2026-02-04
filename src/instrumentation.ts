export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { migrate } = await import('drizzle-orm/better-sqlite3/migrator');
    const { db } = await import('@/db');

    await migrate(db, { migrationsFolder: './drizzle' });
  }
}
