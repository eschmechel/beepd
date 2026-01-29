import { getDb } from '@/db/client';
import { users, sessions, userIdentities, otpChallenges } from '@/db/schema';
import { sql, eq, gte, count } from 'drizzle-orm';

// -----------------------------------------------------------------------------
// Health Checks
// -----------------------------------------------------------------------------

export async function healthCheck(env: { DB: D1Database }): Promise<{
  status: 'healthy' | 'unhealthy';
  latencyMs: number;
  error?: string;
}> {
  const start = performance.now();
  try {
    await env.DB.prepare('SELECT 1').first();
    return {
      status: 'healthy',
      latencyMs: Math.round(performance.now() - start),
    };
  } catch (err) {
    return {
      status: 'unhealthy',
      latencyMs: Math.round(performance.now() - start),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// -----------------------------------------------------------------------------
// Analytics & Business Metrics
// -----------------------------------------------------------------------------

export interface UserCount {
  total: number;
  activeLast24h: number;
  activeLast7d: number;
  activeLast30d: number;
}

export interface SessionStats {
  total: number;
  active: number;
  revoked: number;
}

export async function getUserStats(env: {
  DB: D1Database;
}): Promise<UserCount> {
  const db = getDb(env);

  const [totalResult] = await db.select({ count: count() }).from(users);
  const [active24h] = await db
    .select({ count: count() })
    .from(users)
    .where(gte(users.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)));
  const [active7d] = await db
    .select({ count: count() })
    .from(users)
    .where(
      gte(users.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    );
  const [active30d] = await db
    .select({ count: count() })
    .from(users)
    .where(
      gte(users.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    );

  return {
    total: totalResult?.count ?? 0,
    activeLast24h: active24h?.count ?? 0,
    activeLast7d: active7d?.count ?? 0,
    activeLast30d: active30d?.count ?? 0,
  };
}

export async function getSessionStats(env: {
  DB: D1Database;
}): Promise<SessionStats> {
  const db = getDb(env);

  const [total] = await db.select({ count: count() }).from(sessions);
  const [active] = await db
    .select({ count: count() })
    .from(sessions)
    .where(sql`${sessions.revokedAt} IS NULL`);
  const [revoked] = await db
    .select({ count: count() })
    .from(sessions)
    .where(sql`${sessions.revokedAt} IS NOT NULL`);

  return {
    total: total?.count ?? 0,
    active: active?.count ?? 0,
    revoked: revoked?.count ?? 0,
  };
}

export async function getIdentityStats(env: { DB: D1Database }): Promise<{
  email: number;
  phone: number;
}> {
  const db = getDb(env);

  const [email] = await db
    .select({ count: count() })
    .from(userIdentities)
    .where(eq(userIdentities.type, 'email'));
  const [phone] = await db
    .select({ count: count() })
    .from(userIdentities)
    .where(eq(userIdentities.type, 'phone'));

  return {
    email: email?.count ?? 0,
    phone: phone?.count ?? 0,
  };
}

// -----------------------------------------------------------------------------
// Admin / Cleanup Operations
// -----------------------------------------------------------------------------

export async function cleanupExpiredSessions(env: {
  DB: D1Database;
}): Promise<number> {
  const db = getDb(env);
  const result = await db
    .delete(sessions)
    .where(sql`${sessions.expiresAt} < datetime('now')`)
    .run();
  return result.meta.changes ?? 0;
}

export async function getDatabaseStats(env: { DB: D1Database }): Promise<{
  users: number;
  sessions: number;
  devices: number;
  identities: number;
  otpChallenges: number;
}> {
  const db = getDb(env);

  const [usersCount] = await db.select({ count: count() }).from(users);
  const [sessionsCount] = await db.select({ count: count() }).from(sessions);
  const [devicesCount] = await db.select({ count: count() }).from(sql`devices`);
  const [identitiesCount] = await db
    .select({ count: count() })
    .from(userIdentities);
  const [otpCount] = await db.select({ count: count() }).from(otpChallenges);

  return {
    users: usersCount?.count ?? 0,
    sessions: sessionsCount?.count ?? 0,
    devices: devicesCount?.count ?? 0,
    identities: identitiesCount?.count ?? 0,
    otpChallenges: otpCount?.count ?? 0,
  };
}
