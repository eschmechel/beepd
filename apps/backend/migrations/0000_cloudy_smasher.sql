CREATE TABLE `blocked_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`blocker_id` integer NOT NULL,
	`blocked_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`blocker_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`blocked_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "no_self_block" CHECK("blocked_users"."blocker_id" != "blocked_users"."blocked_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `blocker_blocked_unique` ON `blocked_users` (`blocker_id`,`blocked_id`);--> statement-breakpoint
CREATE INDEX `blocker_idx` ON `blocked_users` (`blocker_id`);--> statement-breakpoint
CREATE INDEX `blocked_idx` ON `blocked_users` (`blocked_id`);--> statement-breakpoint
CREATE TABLE `consent_grants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`purpose` text NOT NULL,
	`granted` integer NOT NULL,
	`version` text NOT NULL,
	`granted_at` integer NOT NULL,
	`withdrawn_at` integer,
	`ip_address` text,
	`user_agent` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `consent_user_idx` ON `consent_grants` (`user_id`);--> statement-breakpoint
CREATE INDEX `consent_purpose_idx` ON `consent_grants` (`purpose`);--> statement-breakpoint
CREATE TABLE `friendships` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`friend_id` integer NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`friend_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "no_self_friend" CHECK("friendships"."user_id" != "friendships"."friend_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_friend_unique` ON `friendships` (`user_id`,`friend_id`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `friendships` (`user_id`);--> statement-breakpoint
CREATE INDEX `friend_id_idx` ON `friendships` (`friend_id`);--> statement-breakpoint
CREATE TABLE `locations` (
	`user_id` integer PRIMARY KEY NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`accuracy` real,
	`is_simulated` integer DEFAULT false NOT NULL,
	`updated_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "lat_check" CHECK("locations"."latitude" BETWEEN -90 AND 90),
	CONSTRAINT "lon_check" CHECK("locations"."longitude" BETWEEN -180 AND 180)
);
--> statement-breakpoint
CREATE INDEX `expires_at_idx` ON `locations` (`expires_at`);--> statement-breakpoint
CREATE TABLE `posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `posts_slug_unique` ON `posts` (`slug`);--> statement-breakpoint
CREATE INDEX `posts_slug_idx` ON `posts` (`slug`);--> statement-breakpoint
CREATE INDEX `posts_status_idx` ON `posts` (`status`);--> statement-breakpoint
CREATE TABLE `proximity_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`nearby_user_id` integer NOT NULL,
	`state` text NOT NULL,
	`last_checked_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`nearby_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "no_self_proximity" CHECK("proximity_events"."user_id" != "proximity_events"."nearby_user_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `paire_unique` ON `proximity_events` (`user_id`,`nearby_user_id`);--> statement-breakpoint
CREATE INDEX `proximity_expires_at_idx` ON `proximity_events` (`expires_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`device_secret_hash` text NOT NULL,
	`friend_code` text(8) NOT NULL,
	`display_name` text(50),
	`mode` text DEFAULT 'OFF' NOT NULL,
	`radius_meters` integer DEFAULT 500 NOT NULL,
	`show_friends_on_map` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "mode_check" CHECK("users"."mode" IN ('OFF', 'FRIENDS_ONLY', 'EVERYONE')),
	CONSTRAINT "radius_check" CHECK("users"."radius_meters" BETWEEN 100 AND 5000),
	CONSTRAINT "friend_code_len" CHECK(LENGTH("users"."friend_code") = 8)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_device_secret_hash_unique` ON `users` (`device_secret_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_friend_code_unique` ON `users` (`friend_code`);