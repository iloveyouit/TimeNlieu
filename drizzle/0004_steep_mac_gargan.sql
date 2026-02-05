PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_timesheetEntries` (
	`id` text PRIMARY KEY NOT NULL,
	`date` integer NOT NULL,
	`hours` real NOT NULL,
	`description` text,
	`projectId` text,
	`taskId` text,
	`roleId` text,
	`entryType` text DEFAULT 'Work' NOT NULL,
	`status` text DEFAULT 'Draft' NOT NULL,
	`userId` text NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`taskId`) REFERENCES `projectTasks`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_timesheetEntries`("id", "date", "hours", "description", "projectId", "taskId", "roleId", "entryType", "status", "userId") SELECT "id", "date", "hours", "description", "projectId", "taskId", "roleId", "entryType", "status", "userId" FROM `timesheetEntries`;--> statement-breakpoint
DROP TABLE `timesheetEntries`;--> statement-breakpoint
ALTER TABLE `__new_timesheetEntries` RENAME TO `timesheetEntries`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `users` ADD `initialLieuBalance` real DEFAULT 0;