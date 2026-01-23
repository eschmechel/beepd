import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const otpChallenges = sqliteTable(
  'otp_challenges',
  {
    id: text('id').primaryKey(),
    identifierType: text('identifier_type', {
      enum: ['email', 'phone'],
    }).notNull(),
    identifierValue: text('identifier_value').notNull(),
    purpose: text('purpose', { enum: ['login', 'link'] }).notNull(),
    codeHash: text('code_hash').notNull(),
    attemptCount: integer('attempt_count').notNull().default(0),
    resendAvailableAt: integer('resend_available_at', {
      mode: 'timestamp',
    }).notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    consumedAt: integer('consumed_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    // Optional: store hashed IP/user-agent for rate-limiting/abuse detection later.
    ipHash: text('ip_hash'),
  },
  (table) => [
    index('otp_challenges_identifier_idx').on(
      table.identifierType,
      table.identifierValue
    ),
  ]
);
