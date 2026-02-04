CREATE TABLE `projects` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `code` text NOT NULL,
  `clientName` text,
  `isActive` integer DEFAULT true
);
--> statement-breakpoint
CREATE TABLE `projectTasks` (
  `id` text PRIMARY KEY NOT NULL,
  `projectId` text NOT NULL,
  `name` text NOT NULL,
  `code` text,
  FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `roles` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lieuLedger` (
  `id` text PRIMARY KEY NOT NULL,
  `userId` text NOT NULL,
  `weekStartDate` integer NOT NULL,
  `totalHours` real NOT NULL,
  `overtimeHours` real NOT NULL,
  `lieuEarned` real NOT NULL,
  `runningBalance` real NOT NULL,
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `config` (
  `key` text PRIMARY KEY NOT NULL,
  `value` real NOT NULL
);
--> statement-breakpoint
ALTER TABLE `timesheetEntries` ADD COLUMN `projectId` text REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null;
--> statement-breakpoint
ALTER TABLE `timesheetEntries` ADD COLUMN `taskId` text REFERENCES `projectTasks`(`id`) ON UPDATE no action ON DELETE set null;
--> statement-breakpoint
ALTER TABLE `timesheetEntries` ADD COLUMN `roleId` text REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE set null;
--> statement-breakpoint
ALTER TABLE `timesheetEntries` ADD COLUMN `entryType` text NOT NULL DEFAULT 'Work';
--> statement-breakpoint
ALTER TABLE `timesheetEntries` ADD COLUMN `status` text NOT NULL DEFAULT 'Draft';
--> statement-breakpoint
DROP TABLE `weeklySummaries`;
