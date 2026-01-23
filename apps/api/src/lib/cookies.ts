import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';

export const REFRESH_COOKIE_NAME = 'beepd_refresh';

function isSecure(appEnv: unknown) {
  // Local wrangler/dev should stay non-secure so cookies work over http.
  return appEnv === 'staging' || appEnv === 'prod';
}

export function getRefreshTokenCookie(c: Context) {
  return getCookie(c, REFRESH_COOKIE_NAME);
}

export function setRefreshTokenCookie(
  c: Context,
  token: string,
  ttlSeconds: number
) {
  const appEnv = (c as unknown as { var?: { env?: { APP_ENV?: string } } }).var
    ?.env?.APP_ENV;

  setCookie(c, REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isSecure(appEnv),
    sameSite: 'Lax',
    path: '/',
    maxAge: ttlSeconds,
  });
}

export function clearRefreshTokenCookie(c: Context) {
  deleteCookie(c, REFRESH_COOKIE_NAME, { path: '/' });
}
