import { getDb } from '@/db/client';
import { drizzle } from 'drizzle-orm/d1';
import { sql, eq, desc, and, or, isNull } from 'drizzle-orm';
import {
  devices,
  oauthStates,
  otpChallenges,
  sessions,
  userIdentities,
  users,
} from '@/db/schema';
import type { IdentityType } from '@/db/schema/userIdentities';

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserIdentity = typeof userIdentities.$inferSelect;
export type NewUserIdentity = typeof userIdentities.$inferInsert;
export type OtpChallenge = typeof otpChallenges.$inferSelect;
export type NewOtpChallenge = typeof otpChallenges.$inferInsert;
export type Device = typeof devices.$inferSelect;
export type NewDevice = typeof devices.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type OauthState = typeof oauthStates.$inferSelect;
export type NewOauthState = typeof oauthStates.$inferInsert;

// Helper to convert Date to ISO string for D1
function toIsoString(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  if (typeof date === 'string') return date;
  return date.toISOString();
}

// -----------------------------------------------------------------------------
// Users
// -----------------------------------------------------------------------------

export async function findUserById(
  env: { DB: D1Database },
  userId: string
): Promise<User | null> {
  const db = getDb(env);
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .get();
  return result ?? null;
}

export async function createUser(
  env: { DB: D1Database },
  data: NewUser
): Promise<User | null> {
  const db = getDb(env);
  const result = await db
    .insert(users)
    .values({
      id: data.id,
      displayName: data.displayName,
      avatarUrl: data.avatarUrl ?? null,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      deletedAt: data.deletedAt ? new Date(data.deletedAt) : null,
    })
    .returning()
    .get();
  return result;
}

export async function updateUser(
  env: { DB: D1Database },
  userId: string,
  data: Partial<NewUser>
): Promise<User | null> {
  const db = getDb(env);
  const updates: Record<string, unknown> = {};

  if (data.displayName !== undefined) updates.displayName = data.displayName;
  if (data.avatarUrl !== undefined) updates.avatarUrl = data.avatarUrl;
  if (data.deletedAt !== undefined) {
    updates.deletedAt = data.deletedAt ? new Date(data.deletedAt) : null;
  }

  if (Object.keys(updates).length === 0) {
    return findUserById(env, userId);
  }

  const result = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, userId))
    .returning()
    .get();
  return result ?? null;
}

// -----------------------------------------------------------------------------
// User Identities
// -----------------------------------------------------------------------------

export async function findIdentity(
  env: { DB: D1Database },
  type: 'email' | 'phone',
  value: string
): Promise<UserIdentity | null> {
  const db = getDb(env);
  const result = await db
    .select()
    .from(userIdentities)
    .where(and(eq(userIdentities.type, type), eq(userIdentities.value, value)))
    .get();
  return result ?? null;
}

export async function findIdentityByUserId(
  env: { DB: D1Database },
  userId: string
): Promise<UserIdentity[]> {
  const db = getDb(env);
  return db
    .select()
    .from(userIdentities)
    .where(eq(userIdentities.userId, userId))
    .all();
}

export async function findIdentityByProvider(
  env: { DB: D1Database },
  provider: IdentityType,
  providerUserId: string
): Promise<UserIdentity | null> {
  const db = getDb(env);
  const result = await db
    .select()
    .from(userIdentities)
    .where(
      and(
        eq(userIdentities.type, provider),
        eq(userIdentities.value, providerUserId)
      )
    )
    .get();
  return result ?? null;
}

export async function findIdentityByEmail(
  env: { DB: D1Database },
  email: string
): Promise<UserIdentity | null> {
  const db = getDb(env);
  const normalizedEmail = email.toLowerCase().trim();
  const result = await db
    .select()
    .from(userIdentities)
    .where(eq(userIdentities.value, normalizedEmail))
    .get();
  return result ?? null;
}

export async function createIdentity(
  env: { DB: D1Database },
  data: NewUserIdentity
): Promise<UserIdentity | null> {
  const db = getDb(env);
  const result = await db
    .insert(userIdentities)
    .values({
      id: data.id,
      userId: data.userId,
      type: data.type,
      value: data.value,
      verifiedAt: data.verifiedAt ? new Date(data.verifiedAt) : null,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
    })
    .returning()
    .get();
  return result;
}

export async function verifyIdentity(
  env: { DB: D1Database },
  id: string
): Promise<UserIdentity | null> {
  const db = getDb(env);
  const result = await db
    .update(userIdentities)
    .set({ verifiedAt: new Date() })
    .where(eq(userIdentities.id, id))
    .returning()
    .get();
  return result ?? null;
}

// -----------------------------------------------------------------------------
// OTP Challenges
// -----------------------------------------------------------------------------

export async function createOtpChallenge(
  env: { DB: D1Database },
  data: NewOtpChallenge
): Promise<OtpChallenge | null> {
  const db = getDb(env);
  const result = await db
    .insert(otpChallenges)
    .values({
      id: data.id,
      identifierType: data.identifierType,
      identifierValue: data.identifierValue,
      purpose: data.purpose,
      codeHash: data.codeHash,
      attemptCount: data.attemptCount ?? 0,
      resendAvailableAt: data.resendAvailableAt
        ? new Date(data.resendAvailableAt)
        : new Date(),
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : new Date(),
      consumedAt: data.consumedAt ? new Date(data.consumedAt) : null,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      ipHash: data.ipHash ?? null,
    })
    .returning()
    .get();
  return result;
}

export async function findValidOtpChallenge(
  env: { DB: D1Database },
  type: 'email' | 'phone',
  value: string,
  purpose: 'login' | 'link'
): Promise<OtpChallenge | null> {
  const db = getDb(env);
  const result = await db
    .select()
    .from(otpChallenges)
    .where(
      and(
        eq(otpChallenges.identifierType, type),
        eq(otpChallenges.identifierValue, value),
        eq(otpChallenges.purpose, purpose),
        isNull(otpChallenges.consumedAt)
      )
    )
    .orderBy(desc(otpChallenges.createdAt))
    .limit(1)
    .get();
  return result ?? null;
}

export async function consumeOtpChallenge(
  env: { DB: D1Database },
  id: string
): Promise<OtpChallenge | null> {
  const db = getDb(env);
  const result = await db
    .update(otpChallenges)
    .set({ consumedAt: new Date() })
    .where(eq(otpChallenges.id, id))
    .returning()
    .get();
  return result ?? null;
}

export async function incrementOtpAttempt(
  env: { DB: D1Database },
  id: string
): Promise<void> {
  const db = getDb(env);
  await db
    .update(otpChallenges)
    .set({ attemptCount: sql`attempt_count + 1` })
    .where(eq(otpChallenges.id, id))
    .run();
}

export async function getOtpChallenge(
  env: { DB: D1Database },
  id: string
): Promise<OtpChallenge | null> {
  const db = getDb(env);
  const result = await db
    .select()
    .from(otpChallenges)
    .where(eq(otpChallenges.id, id))
    .get();
  return result ?? null;
}

// -----------------------------------------------------------------------------
// Devices
// -----------------------------------------------------------------------------

export async function findDevice(
  env: { DB: D1Database },
  deviceId: string
): Promise<Device | null> {
  const db = getDb(env);
  const result = await db
    .select()
    .from(devices)
    .where(eq(devices.id, deviceId))
    .get();
  return result ?? null;
}

export async function upsertDevice(
  env: { DB: D1Database },
  data: NewDevice
): Promise<Device | null> {
  const db = getDb(env);
  const result = await db
    .insert(devices)
    .values({
      id: data.id,
      userId: data.userId,
      pushToken: data.pushToken ?? null,
      platform: data.platform,
      isPrimary: data.isPrimary ?? false,
      lastSeenAt: data.lastSeenAt ? new Date(data.lastSeenAt) : new Date(),
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
    })
    .onConflictDoUpdate({
      target: devices.id,
      set: {
        userId: data.userId,
        pushToken: data.pushToken ?? null,
        platform: data.platform,
        isPrimary: data.isPrimary ?? false,
        lastSeenAt: new Date(),
      },
    })
    .returning()
    .get();
  return result;
}

// -----------------------------------------------------------------------------
// Sessions
// -----------------------------------------------------------------------------

export async function findSession(
  env: { DB: D1Database },
  sessionId: string
): Promise<Session | null> {
  const db = getDb(env);
  const result = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .get();
  return result ?? null;
}

export async function findSessionByDevice(
  env: { DB: D1Database },
  deviceId: string
): Promise<Session | null> {
  const db = getDb(env);
  const result = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.deviceId, deviceId), isNull(sessions.revokedAt)))
    .get();
  return result ?? null;
}

export async function createSession(
  env: { DB: D1Database },
  data: NewSession
): Promise<Session | null> {
  const db = getDb(env);
  const result = await db
    .insert(sessions)
    .values({
      id: data.id,
      userId: data.userId,
      deviceId: data.deviceId,
      refreshTokenHash: data.refreshTokenHash,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : new Date(),
      revokedAt: data.revokedAt ? new Date(data.revokedAt) : null,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
    })
    .returning()
    .get();
  return result;
}

export async function rotateSession(
  env: { DB: D1Database },
  sessionId: string,
  refreshTokenHash: string
): Promise<Session | null> {
  const db = getDb(env);
  const result = await db
    .update(sessions)
    .set({
      refreshTokenHash,
      updatedAt: new Date(),
    })
    .where(eq(sessions.id, sessionId))
    .returning()
    .get();
  return result ?? null;
}

export async function revokeSession(
  env: { DB: D1Database },
  sessionId: string
): Promise<Session | null> {
  const db = getDb(env);
  const result = await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.id, sessionId))
    .returning()
    .get();
  return result ?? null;
}

export async function findSessionsByUserId(
  env: { DB: D1Database },
  userId: string
): Promise<Session[]> {
  const db = getDb(env);
  return db.select().from(sessions).where(eq(sessions.userId, userId)).all();
}

export async function revokeAllUserSessions(
  env: { DB: D1Database },
  userId: string
): Promise<void> {
  const db = getDb(env);
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.userId, userId))
    .run();
}

// -----------------------------------------------------------------------------
// OAuth States
// -----------------------------------------------------------------------------

export async function createOauthState(
  env: { DB: D1Database },
  data: NewOauthState
): Promise<OauthState | null> {
  const db = getDb(env);
  const result = await db
    .insert(oauthStates)
    .values({
      id: data.id,
      provider: data.provider,
      state: data.state,
      redirectUri: data.redirectUri,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : new Date(),
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
    })
    .returning()
    .get();
  return result;
}

export async function findOauthState(
  env: { DB: D1Database },
  state: string
): Promise<OauthState | null> {
  const db = getDb(env);
  const result = await db
    .select()
    .from(oauthStates)
    .where(eq(oauthStates.state, state))
    .get();
  return result ?? null;
}

export async function deleteOauthState(
  env: { DB: D1Database },
  id: string
): Promise<void> {
  const db = getDb(env);
  await db.delete(oauthStates).where(eq(oauthStates.id, id)).run();
}

export async function consumeOauthState(
  env: { DB: D1Database },
  id: string
): Promise<OauthState | null> {
  const db = getDb(env);
  const result = await db
    .delete(oauthStates)
    .where(eq(oauthStates.id, id))
    .returning()
    .get();
  return result ?? null;
}

export async function cleanupExpiredOauthStates(env: {
  DB: D1Database;
}): Promise<void> {
  const db = getDb(env);
  await db
    .delete(oauthStates)
    .where(sql`${oauthStates.expiresAt} < datetime('now')`)
    .run();
}
