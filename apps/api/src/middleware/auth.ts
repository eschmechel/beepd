import type { MiddlewareHandler } from 'hono';

import type { AppEnv } from '@/routes/v1/_types';

import { verifyAccessToken } from '@/lib/auth';
import { errors } from '@/lib/errors';

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const header = c.req.header('authorization') ?? '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return errors.unauthorized(c);
  }

  try {
    const payload = await verifyAccessToken({
      env: c.var.env,
      token: match[1],
    });
    c.set('userId', payload.sub);
    c.set('sessionId', payload.sid);
    c.set('deviceId', payload.did);
  } catch {
    return errors.unauthorized(c);
  }

  await next();
};
