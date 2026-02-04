import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

const dbPath = (process.env.DATABASE_URL ?? 'file:./dev.db').replace(/^file:/, '');
const sqlite = new Database(dbPath);

// WAL allows concurrent reads while a write is in progress.
// foreign_keys is OFF by default in SQLite and must be enabled per-connection.
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
