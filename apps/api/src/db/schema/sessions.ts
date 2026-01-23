import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

import { devices } from '@/db/schema/devices';
import { users } from '@/db/schema/users';

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    deviceId: text('device_id')
      .notNull()
      .references(() => devices.id, { onDelete: 'cascade' }),
    refreshTokenHash: text('refresh_token_hash').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    revokedAt: integer('revoked_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index('sessions_user_id_idx').on(table.userId),
    // v0.1: one active session per device (refresh rotation updates this row).
    uniqueIndex('sessions_device_id_unique').on(table.deviceId),
  ]
);
