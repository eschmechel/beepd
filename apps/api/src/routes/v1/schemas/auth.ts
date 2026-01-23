import { z } from 'zod';

import {
  isoDateTimeSchema,
  okSchema,
  platformSchema,
  uuidSchema,
} from './common';

export const authStartRequestSchema = z.object({
  identifier: z.string().min(1),
});

export const authStartResponseSchema = okSchema.extend({
  // Optional convenience field if you want to expose cooldown timing.
  resendAvailableAt: isoDateTimeSchema.optional(),
});

export const authVerifyRequestSchema = z.object({
  identifier: z.string().min(1),
  code: z.string().regex(/^\d{6}$/),
  device: z.object({
    id: uuidSchema,
    platform: platformSchema,
    pushToken: z.string().min(1).optional(),
  }),
});

export const authMeUserSchema = z.object({
  id: uuidSchema,
  displayName: z.string(),
  avatarUrl: z.string().url().nullable().optional(),
});

export const authMeDeviceSchema = z.object({
  id: uuidSchema,
  platform: platformSchema,
  pushToken: z.string().nullable().optional(),
  isPrimary: z.boolean().optional(),
  lastSeenAt: isoDateTimeSchema.nullable().optional(),
});

export const authMeSessionSchema = z.object({
  id: uuidSchema,
  deviceId: uuidSchema,
  expiresAt: isoDateTimeSchema,
  revokedAt: isoDateTimeSchema.nullable().optional(),
});

export const authVerifyResponseSchema = okSchema.extend({
  accessToken: z.string().min(1),
  user: authMeUserSchema,
  session: authMeSessionSchema,
  device: authMeDeviceSchema,
});

export const authRefreshRequestSchema = z.object({});

export const authRefreshResponseSchema = okSchema.extend({
  accessToken: z.string().min(1),
});

export const authLogoutRequestSchema = z.object({});

export const authLogoutResponseSchema = okSchema;

export const authMeResponseSchema = okSchema.extend({
  user: authMeUserSchema,
  session: authMeSessionSchema,
  device: authMeDeviceSchema,
});
