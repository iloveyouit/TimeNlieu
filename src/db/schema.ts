import { sqliteTable, text, integer, real, primaryKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').notNull().primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: integer('emailVerified', { mode: 'timestamp_ms' }),
  image: text('image'),
  password: text('password'),
  isAdmin: integer('isAdmin', { mode: 'boolean' }).default(false),
  initialLieuBalance: real('initialLieuBalance').default(0),
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

export const projects = sqliteTable('projects', {
  id: text('id').notNull().primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  clientName: text('clientName'),
  isActive: integer('isActive', { mode: 'boolean' }).default(true),
});

export const projectTasks = sqliteTable('projectTasks', {
  id: text('id').notNull().primaryKey(),
  projectId: text('projectId')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  code: text('code'),
});

export const roles = sqliteTable('roles', {
  id: text('id').notNull().primaryKey(),
  name: text('name').notNull(),
});

export const timesheetEntries = sqliteTable('timesheetEntries', {
  id: text('id').notNull().primaryKey(),
  date: integer('date', { mode: 'timestamp_ms' }).notNull(),
  hours: real('hours').notNull(),
  description: text('description'),
  projectId: text('projectId').references(() => projects.id, { onDelete: 'set null' }),
  taskId: text('taskId').references(() => projectTasks.id, { onDelete: 'set null' }),
  roleId: text('roleId').references(() => roles.id, { onDelete: 'set null' }),
  entryType: text('entryType').notNull().default('Work'),
  status: text('status').notNull().default('Draft'),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});

export const lieuLedger = sqliteTable('lieuLedger', {
  id: text('id').notNull().primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  weekStartDate: integer('weekStartDate', { mode: 'timestamp_ms' }).notNull(),
  totalHours: real('totalHours').notNull(),
  overtimeHours: real('overtimeHours').notNull(),
  lieuEarned: real('lieuEarned').notNull(),
  runningBalance: real('runningBalance').notNull(),
});

export const config = sqliteTable('config', {
  key: text('key').notNull().primaryKey(),
  value: real('value').notNull(),
});

export const notifications = sqliteTable('notifications', {
  id: text('id').notNull().primaryKey(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  isRead: integer('isRead', { mode: 'boolean' }).default(false),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(strftime('%s','now') * 1000)`),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});
