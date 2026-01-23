import type { Context } from 'hono';

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

function errorBody(message: string, details?: unknown) {
  if (details === undefined) return { error: message };
  return { error: message, details };
}

export const errors = {
  badRequest(c: Context, message: string, details?: unknown) {
    return c.json(errorBody(message, details), 400 as const);
  },
  unauthorized(c: Context, message = 'Unauthorized') {
    return c.json(errorBody(message), 401 as const);
  },
  forbidden(c: Context, message = 'Forbidden') {
    return c.json(errorBody(message), 403 as const);
  },
  notFound(c: Context, message = 'Not found') {
    return c.json(errorBody(message), 404 as const);
  },
  conflict(c: Context, message: string) {
    return c.json(errorBody(message), 409 as const);
  },
  internal(c: Context, message = 'Internal server error') {
    return c.json(errorBody(message), 500 as const);
  },
};

export function asErrorResponse(c: Context, err: unknown) {
  if (isApiError(err)) {
    const appEnv = (c as unknown as { var?: { env?: { APP_ENV?: string } } })
      .var?.env?.APP_ENV;
    const details = appEnv === 'dev' ? err.details : undefined;
    return c.json(
      errorBody(err.message, details),
      err.status as 400 | 401 | 403 | 404 | 409 | 500
    );
  }

  return errors.internal(c);
}
