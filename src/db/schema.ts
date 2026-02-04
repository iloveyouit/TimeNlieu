import { sqliteTable, text, integer, real, primaryKey } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').notNull().primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: integer('emailVerified', { mode: 'timestamp_ms' }),
  image: text('image'),
  password: text('password'),
  isAdmin: integer('isAdmin', { mode: 'boolean' }).default(false),
});

export const accounts = sqliteTable(
  'accounts',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => ({
    compoundKey: primaryKey({ columns: [account.provider, account.providerAccountId] }),
  })
);

export const sessions = sqliteTable('sessions', {
  sessionToken: text('sessionToken').notNull().primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: integer('expires', { mode: 'timestamp_ms' }).notNull(),
});

export const verificationTokens = sqliteTable(
  'verificationTokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: integer('expires', { mode: 'timestamp_ms' }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

export const timesheetEntries = sqliteTable('timesheetEntries', {
  id: text('id').notNull().primaryKey(),
  date: integer('date', { mode: 'timestamp_ms' }).notNull(),
  hours: real('hours').notNull(),
  description: text('description'),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});

export const weeklySummaries = sqliteTable('weeklySummaries', {
  id: text('id').notNull().primaryKey(),
  weekStartDate: integer('weekStartDate', { mode: 'timestamp_ms' }).notNull(),
  weekEndDate: integer('weekEndDate', { mode: 'timestamp_ms' }).notNull(),
  totalHours: real('totalHours').notNull(),
  overtimeHours: real('overtimeHours').notNull(),
  lieuBalance: real('lieuBalance').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});

export const notifications = sqliteTable('notifications', {
  id: text('id').notNull().primaryKey(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  isRead: integer('isRead', { mode: 'boolean' }).default(false),
  metadata: text('metadata', { mode: 'json' }),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});
