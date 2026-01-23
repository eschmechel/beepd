import { z } from 'zod';

export const uuidSchema = z.string().uuid();

export const platformSchema = z.enum(['ios', 'android', 'web']);

// Use ISO-8601 strings for API timestamps.
export const isoDateTimeSchema = z.string().datetime();

export const okSchema = z.object({ ok: z.literal(true) });
