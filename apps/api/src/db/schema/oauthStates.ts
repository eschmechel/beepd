import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const oauthStates = sqliteTable(
  'oauth_states',
  {
    id: text('id').primaryKey(),
    provider: text('provider', {
      enum: ['google', 'microsoft', 'apple', 'github'],
    }).notNull(),
    state: text('state').notNull().unique(),
    redirectUri: text('redirect_uri').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index('oauth_states_state_idx').on(table.state),
    index('oauth_states_provider_idx').on(table.provider),
    index('oauth_states_expires_at_idx').on(table.expiresAt),
  ]
);
