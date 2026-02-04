CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text NOT NULL,
	`emailVerified` integer,
	`image` text,
	`isAdmin` integer DEFAULT false
);
--> statement-breakpoint
CREATE TABLE `accounts` (
	`userId` text NOT NULL,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`providerAccountId` text NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text,
	`scope` text,
	`id_token` text,
	`session_state` text,
	PRIMARY KEY(`provider`, `providerAccountId`),
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`sessionToken` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `verificationTokens` (
	`identifier` text NOT NULL,
	`token` text NOT NULL,
	`expires` integer NOT NULL,
	PRIMARY KEY(`identifier`, `token`)
);
--> statement-breakpoint
CREATE TABLE `timesheetEntries` (
	`id` text PRIMARY KEY NOT NULL,
	`date` integer NOT NULL,
	`hours` real NOT NULL,
	`description` text,
	`userId` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`isRead` integer DEFAULT false,
	`metadata` text,
	`userId` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `weeklySummaries` (
	`id` text PRIMARY KEY NOT NULL,
	`weekStartDate` integer NOT NULL,
	`weekEndDate` integer NOT NULL,
	`totalHours` real NOT NULL,
	`overtimeHours` real NOT NULL,
	`lieuBalance` real NOT NULL,
	`userId` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
