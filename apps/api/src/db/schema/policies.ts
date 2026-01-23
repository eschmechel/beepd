import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

import { users } from '@/db/schema/users';

export const policies = sqliteTable(
  'policies',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    scope: text('scope', { enum: ['global', 'friend', 'group'] }).notNull(),
    // For scope=global, targetId should be NULL.
    targetId: text('target_id'),
    vpr: integer('vpr').notNull().default(250),
    per: integer('per').notNull().default(100),
    locationEnabled: integer('location_enabled', { mode: 'boolean' })
      .notNull()
      .default(true),
    notificationsEnabled: integer('notifications_enabled', { mode: 'boolean' })
      .notNull()
      .default(true),
    excludeFromPermissive: integer('exclude_from_permissive', {
      mode: 'boolean',
    })
      .notNull()
      .default(false),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex('policies_owner_scope_target_unique').on(
      table.ownerId,
      table.scope,
      table.targetId
    ),
    index('policies_owner_id_idx').on(table.ownerId),
  ]
);
