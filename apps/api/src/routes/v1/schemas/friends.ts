import { z } from 'zod';

import { isoDateTimeSchema, okSchema, uuidSchema } from './common';

export const friendsTargetRequestSchema = z.object({
  targetUserId: uuidSchema,
});

export const friendsMutationResponseSchema = okSchema;

export const friendSummarySchema = z.object({
  userId: uuidSchema,
  displayName: z.string().optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

export const friendsListResponseSchema = okSchema.extend({
  friends: z.array(friendSummarySchema),
});

export const friendRequestSchema = z.object({
  userId: uuidSchema,
  initiatedBy: uuidSchema,
  createdAt: isoDateTimeSchema.optional(),
});

export const friendsRequestsResponseSchema = okSchema.extend({
  incoming: z.array(friendRequestSchema),
  outgoing: z.array(friendRequestSchema),
});
