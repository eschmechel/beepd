import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
	id: text("id").primaryKey(),
	displayName: text("display_name").notNull(),
	avatarUrl: text("avatar_url"),
	createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
	deletedAt: integer("deleted_at"),
});
