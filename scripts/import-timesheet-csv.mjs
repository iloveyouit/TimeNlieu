import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import crypto from 'crypto';

const [, , csvPathArg, ...rest] = process.argv;
if (!csvPathArg) {
  console.error('Usage: node scripts/import-timesheet-csv.mjs <path-to-csv> [--dry-run]');
  process.exit(1);
}

const dryRun = rest.includes('--dry-run');
const csvPath = path.resolve(csvPathArg);
const dbPath = (process.env.DATABASE_URL ?? 'file:./dev.db').replace(/^file:/, '');

const parseCsv = (content) => {
  const lines = content.split(/\r?\n/).filter(Boolean);
  const header = lines.shift();
  if (!header) return [];
  const headers = header.split(',').map((h) => h.trim());
  return lines.map((line) => {
    const values = line.split(',');
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx]?.trim() ?? '';
    });
    return row;
  });
};

const toTimestampMs = (yyyyMmDd) => {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

const db = new Database(dbPath);
try {
  db.pragma('foreign_keys = ON');

  const csv = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCsv(csv);

  if (rows.length === 0) {
    console.log('No rows found in CSV.');
    process.exit(0);
  }

  const email = rows[0].user_email;
  if (!email) {
    throw new Error('CSV must include user_email column and value.');
  }

  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (!user) {
    throw new Error(`No user found for email: ${email}`);
  }

  const selectExisting = db.prepare(
    'SELECT id FROM timesheetEntries WHERE userId = ? AND date = ? AND hours = ?'
  );
  const insertEntry = db.prepare(`
    INSERT INTO timesheetEntries (
      id, date, hours, description, projectId, taskId, roleId, entryType, status, userId
    ) VALUES (
      @id, @date, @hours, @description, @projectId, @taskId, @roleId, @entryType, @status, @userId
    )
  `);

  let inserted = 0;
  let skipped = 0;
  let zeroHours = 0;

  const tx = db.transaction((items) => {
    for (const row of items) {
      const hours = Number.parseFloat(row.hours);
      if (!Number.isFinite(hours) || hours <= 0) {
        zeroHours += 1;
        continue;
      }
      const date = toTimestampMs(row.entry_date);
      const existing = selectExisting.get(user.id, date, hours);
      if (existing) {
        skipped += 1;
        continue;
      }
      const entry = {
        id: crypto.randomUUID(),
        date,
        hours,
        description: null,
        projectId: null,
        taskId: null,
        roleId: null,
        entryType: 'Work',
        status: row.status || 'Draft',
        userId: user.id,
      };
      if (!dryRun) {
        insertEntry.run(entry);
      }
      inserted += 1;
    }
  });

  tx(rows);

  console.log(JSON.stringify({
    dryRun,
    inserted,
    skipped,
    zeroHours,
    total: rows.length,
  }, null, 2));
} finally {
  db.close();
}
