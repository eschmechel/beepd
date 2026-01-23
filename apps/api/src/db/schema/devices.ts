import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { users } from "@/db/schema/users";

export const devices = sqliteTable(
	"devices",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		pushToken: text("push_token"),
		platform: text("platform", { enum: ["ios", "android", "web"] }).notNull(),
		isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
		lastSeenAt: integer("last_seen_at"),
		createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
	},
	(table) => ({
		userIdIdx: index("devices_user_id_idx").on(table.userId),
		// Allows one primary device per user (enforce in application logic for now).
		userPrimaryIdx: index("devices_user_is_primary_idx").on(table.userId, table.isPrimary),
		pushTokenUnique: uniqueIndex("devices_push_token_unique").on(table.pushToken),
	}),
);
