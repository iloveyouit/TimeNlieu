ALTER TABLE `notifications` ADD COLUMN `createdAt` integer NOT NULL DEFAULT (strftime('%s','now') * 1000);
