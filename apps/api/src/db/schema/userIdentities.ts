import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

import { users } from '@/db/schema/users';

export const userIdentities = sqliteTable(
  'user_identities',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type', { enum: ['email', 'phone'] }).notNull(),
    value: text('value').notNull(),
    verifiedAt: integer('verified_at'),
    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    valueUnique: uniqueIndex('user_identities_type_value_unique').on(
      table.type,
      table.value
    ),
    userIdIdx: index('user_identities_user_id_idx').on(table.userId),
  })
);
