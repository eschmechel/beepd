import type { Context } from 'hono';
import type { ZodSchema } from 'zod';

import { ApiError } from '@/lib/errors';

export async function readJson(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    throw new ApiError(400, 'Invalid JSON body');
  }
}

export async function readJsonBody<T>(
  c: Context,
  schema: ZodSchema<T>
): Promise<T> {
  const raw = await readJson(c);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError(400, 'Validation failed', parsed.error.flatten());
  }
  return parsed.data;
}
