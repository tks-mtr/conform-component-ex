CREATE TABLE `job_results` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`user_id` text NOT NULL,
	`status` text NOT NULL,
	`payload` text,
	`is_notified` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
