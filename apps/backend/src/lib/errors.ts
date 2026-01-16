// Standardized error response helpers
import type { Context } from 'hono';

export type ErrorCode = 
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    field?: string;  // For validation errors
  };
}

const STATUS_CODES = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
} as const;

/**
 * Return a standardized error response
 */
export function errorResponse(
  c: Context,
  code: ErrorCode,
  message: string,
  field?: string
) {
  const body: ErrorResponse = {
    error: { code, message },
  };
  
  if (field) {
    body.error.field = field;
  }
  
  return c.json(body, STATUS_CODES[code]);
}

/**
 * Common error shortcuts
 */
export const errors = {
  badRequest: (c: Context, message: string, field?: string) =>
    errorResponse(c, 'BAD_REQUEST', message, field),
  
  unauthorized: (c: Context, message = 'Authentication required') =>
    errorResponse(c, 'UNAUTHORIZED', message),
  
  forbidden: (c: Context, message = 'Access denied') =>
    errorResponse(c, 'FORBIDDEN', message),
  
  notFound: (c: Context, message = 'Resource not found') =>
    errorResponse(c, 'NOT_FOUND', message),
  
  conflict: (c: Context, message: string) =>
    errorResponse(c, 'CONFLICT', message),
  
  rateLimited: (c: Context, message = 'Too many requests') =>
    errorResponse(c, 'RATE_LIMITED', message),
  
  internal: (c: Context, message = 'Internal server error') =>
    errorResponse(c, 'INTERNAL_ERROR', message),
};
