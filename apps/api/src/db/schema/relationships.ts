import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { users } from "@/db/schema/users";

export const relationships = sqliteTable(
	"relationships",
	{
		id: text("id").primaryKey(),
		// Store pairs canonically: userAId must be the lexicographically smaller UUID.
		userAId: text("user_a_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		userBId: text("user_b_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		status: text("status", {
			enum: ["pending", "accepted", "blocked_by_a", "blocked_by_b"],
		}).notNull(),
		initiatedBy: text("initiated_by")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
	},
	(table) => ({
		pairUnique: uniqueIndex("relationships_user_a_user_b_unique").on(table.userAId, table.userBId),
		userAIdx: index("relationships_user_a_id_idx").on(table.userAId),
		userBIdx: index("relationships_user_b_id_idx").on(table.userBId),
	}),
);
