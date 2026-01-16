// Zod validation schemas for API request bodies
import { z } from 'zod';

// ============================================================================
// Auth Schemas
// ============================================================================

export const loginSchema = z.object({
  deviceSecret: z.string().min(1, 'Device secret is required'),
});

// Register doesn't require a body (generates new device)

// ============================================================================
// User Settings Schemas
// ============================================================================

export const updateSettingsSchema = z.object({
  mode: z.enum(['OFF', 'FRIENDS_ONLY', 'EVERYONE']).optional(),
  radiusMeters: z.number().int().min(100).max(5000).optional(),
  displayName: z.string().max(50).nullable().optional(),
  showFriendsOnMap: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
});

// ============================================================================
// Location Schemas
// ============================================================================

export const updateLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().positive().optional(),
  isSimulated: z.boolean().optional().default(false),
});

export const nearbyQuerySchema = z.object({
  scope: z.enum(['friends', 'everyone']).optional().default('friends'),
});

// ============================================================================
// Friends Schemas
// ============================================================================

export const acceptInviteSchema = z.object({
  friendCode: z.string().length(8, 'Friend code must be 8 characters'),
});

export const friendIdParamSchema = z.object({
  friendId: z.string().transform((val, ctx) => {
    const parsed = parseInt(val, 10);
    if (isNaN(parsed)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Friend ID must be a number',
      });
      return z.NEVER;
    }
    return parsed;
  }),
});

// ============================================================================
// Consent Schemas
// ============================================================================

export const updateConsentSchema = z.object({
  purpose: z.enum(['LOCATION', 'CALENDAR', 'CONTACTS', 'ANALYTICS']),
  granted: z.boolean(),
  version: z.string().min(1, 'Privacy policy version is required'),
});

// ============================================================================
// Blog Schemas
// ============================================================================

export const blogSlugParamSchema = z.object({
  slug: z.string().min(1).max(200),
});

export const blogQuerySchema = z.object({
  page: z.string().optional().default('1').transform(Number),
  limit: z.string().optional().default('10').transform(Number),
});

// ============================================================================
// Type exports (inferred from schemas)
// ============================================================================

export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
export type NearbyQuery = z.infer<typeof nearbyQuerySchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
export type UpdateConsentInput = z.infer<typeof updateConsentSchema>;
export type BlogQuery = z.infer<typeof blogQuerySchema>;
