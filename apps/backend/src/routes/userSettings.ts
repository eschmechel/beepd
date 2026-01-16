// User settings routes: /me/settings

import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import type { Env, Variables } from '@/types/env';
import type { UserSettings } from '@/types/api';
import type { UpdateSettingsInput } from '@/validators/schemas';
import { updateSettingsSchema } from '@/validators/schemas';
import { createDb } from '@/lib/db';
import { errors } from '@/lib/errors';
import { authMiddleware } from '@/middleware/auth';
import { users } from '@/db/schema';

export const userSettingsRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// Apply auth middleware to all routes
userSettingsRoutes.use('*', authMiddleware);

function buildUpdateData(input: UpdateSettingsInput): Partial<typeof users.$inferInsert> {
  const setData: Partial<typeof users.$inferInsert> = {};
  if (input.mode !== undefined) setData.mode = input.mode;
  if (input.radiusMeters !== undefined) setData.radiusMeters = input.radiusMeters;
  if (input.displayName !== undefined) setData.displayName = input.displayName;
  if (input.showFriendsOnMap !== undefined) setData.showFriendsOnMap = input.showFriendsOnMap;
  return setData;
}

function validateUpdateInput(body: unknown): { success: true; data: UpdateSettingsInput } | { success: false; error: { message: string; field?: string } } {
  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path?.length ? String(issue.path.join('.')) : undefined;
    return { success: false, error: { message: issue.message, field } };
  }
  if (Object.keys(parsed.data).length === 0) {
    return { success: false, error: { message: 'No fields to update' } };
  }
  return { success: true, data: parsed.data };
}

function toUserSettings(user: { id: number; displayName: string | null; mode: string; radiusMeters: number; friendCode: string; showFriendsOnMap: boolean }): UserSettings {
  return {
    userId: user.id,
    displayName: user.displayName,
    mode: user.mode as 'OFF' | 'FRIENDS_ONLY' | 'EVERYONE',
    radiusMeters: user.radiusMeters,
    friendCode: user.friendCode,
    showFriendsOnMap: user.showFriendsOnMap,
  };
}

/**
 * GET /me/settings
 * Retrieve current user's settings
 */
userSettingsRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) return errors.unauthorized(c, 'Not authenticated');

  const db = createDb(c.env.DB);
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, displayName: true, mode: true, radiusMeters: true, friendCode: true, showFriendsOnMap: true },
  });
  if (!user) return errors.notFound(c, 'User not found');

  return c.json({ out: toUserSettings(user) }, 200);
});

/**
 * PUT /me/settings
 * Update current user's settings (partial update)
 */
userSettingsRoutes.put('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) return errors.unauthorized(c, 'Not authenticated');

  const body = await c.req.json().catch(() => null);
  if (!body) return errors.badRequest(c, 'Invalid JSON');

  const validation = validateUpdateInput(body);
  if (!validation.success) {
    return errors.badRequest(c, validation.error.message, validation.error.field);
  }

  const db = createDb(c.env.DB);
  const setData = buildUpdateData(validation.data);
  if (Object.keys(setData).length === 0) return errors.badRequest(c,'No fields to update');

  await db.update(users).set(setData).where(eq(users.id, userId));

  const updated = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, displayName: true, mode: true, radiusMeters: true, friendCode: true, showFriendsOnMap: true },
  });
  if (!updated) return errors.notFound(c, 'User not found');

  return c.json({ out: toUserSettings(updated) }, 200);
});
