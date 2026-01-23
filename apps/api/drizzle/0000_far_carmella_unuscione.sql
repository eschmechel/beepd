CREATE TABLE `devices` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`push_token` text,
	`platform` text NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`last_seen_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `devices_user_id_idx` ON `devices` (`user_id`);--> statement-breakpoint
CREATE INDEX `devices_user_is_primary_idx` ON `devices` (`user_id`,`is_primary`);--> statement-breakpoint
CREATE UNIQUE INDEX `devices_push_token_unique` ON `devices` (`push_token`);--> statement-breakpoint
CREATE TABLE `otp_challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier_type` text NOT NULL,
	`identifier_value` text NOT NULL,
	`purpose` text NOT NULL,
	`code_hash` text NOT NULL,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`resend_available_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`consumed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`ip_hash` text
);
--> statement-breakpoint
CREATE INDEX `otp_challenges_identifier_idx` ON `otp_challenges` (`identifier_type`,`identifier_value`);--> statement-breakpoint
CREATE TABLE `policies` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`scope` text NOT NULL,
	`target_id` text,
	`vpr` integer DEFAULT 250 NOT NULL,
	`per` integer DEFAULT 100 NOT NULL,
	`location_enabled` integer DEFAULT true NOT NULL,
	`notifications_enabled` integer DEFAULT true NOT NULL,
	`exclude_from_permissive` integer DEFAULT false NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `policies_owner_scope_target_unique` ON `policies` (`owner_id`,`scope`,`target_id`);--> statement-breakpoint
CREATE INDEX `policies_owner_id_idx` ON `policies` (`owner_id`);--> statement-breakpoint
CREATE TABLE `relationships` (
	`id` text PRIMARY KEY NOT NULL,
	`user_a_id` text NOT NULL,
	`user_b_id` text NOT NULL,
	`status` text NOT NULL,
	`initiated_by` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_a_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_b_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`initiated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `relationships_user_a_user_b_unique` ON `relationships` (`user_a_id`,`user_b_id`);--> statement-breakpoint
CREATE INDEX `relationships_user_a_id_idx` ON `relationships` (`user_a_id`);--> statement-breakpoint
CREATE INDEX `relationships_user_b_id_idx` ON `relationships` (`user_b_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`device_id` text NOT NULL,
	`refresh_token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`revoked_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_device_id_unique` ON `sessions` (`device_id`);--> statement-breakpoint
CREATE TABLE `user_identities` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`value` text NOT NULL,
	`verified_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_identities_type_value_unique` ON `user_identities` (`type`,`value`);--> statement-breakpoint
CREATE INDEX `user_identities_user_id_idx` ON `user_identities` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`avatar_url` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer
);
