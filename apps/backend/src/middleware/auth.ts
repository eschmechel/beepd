// JWT authentication middleware
import { createMiddleware } from 'hono/factory';
import type { Env, Variables } from '../types/env';
import { verifyToken } from '../lib/jwt';
import { errors } from '../lib/errors';

/**
 * Middleware to verify JWT and extract userId
 * Attaches userId to context variables
 */
export const authMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: Variables;
}>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader) {
    return errors.unauthorized(c, 'Missing Authorization header');
  }
  
  // Expect "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return errors.unauthorized(c, 'Invalid Authorization header format');
  }
  
  const token = parts[1];
  const userId = await verifyToken(token, c.env.JWT_SECRET);
  
  if (!userId) {
    return errors.unauthorized(c, 'Invalid or expired token');
  }
  
  // Attach userId to context for use in route handlers
  c.set('userId', userId);
  
  await next();
});
