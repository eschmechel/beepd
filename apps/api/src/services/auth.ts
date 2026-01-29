/**
 * Auth Service
 *
 * Handles session management, token creation/verification, and auth flow orchestration.
 * Works with otp.ts and oauth.ts to complete authentication.
 *
 * Token Strategy:
 * - Access Token: JWS (iron-session), 15 min lifetime, memory only
 * - Refresh Token: JWE (iron-session), 30 days, HttpOnly cookie + D1 hash
 * - Refresh rotation: Each use issues new token, invalidates old one
 */

import type { Env } from '@/env';
import type { User, Session, Device } from '@/db/queries/auth';

export interface SessionResponse {
  user: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
  session: {
    id: string;
    deviceId: string;
    expiresAt: string;
  };
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
}

export interface AccessTokenClaims {
  sub: string;
  sid: string;
  exp: number;
  iat: number;
  type: 'access';
}

export interface RefreshTokenClaims {
  sub: string;
  sid: string;
  exp: number;
  iat: number;
  type: 'refresh';
  tokenId: string;
}

export function createUserSession(
  _user: User,
  _device: Device,
  _env?: Env
): Promise<SessionResponse> {
  return Promise.reject(
    new Error('Not implemented - implement createUserSession()')
  );
}

export function verifyAndCreateSession(
  _identifierType: string,
  _identifierValue: string,
  _code: string,
  _codeHash: string,
  _challengeId: string,
  _deviceToken: string,
  _platform: string,
  _env?: Env
): Promise<SessionResponse> {
  return Promise.reject(
    new Error('Not implemented - implement verifyAndCreateSession()')
  );
}

export function refreshAccessToken(
  _refreshToken: string,
  _env?: Env
): Promise<SessionResponse> {
  return Promise.reject(
    new Error('Not implemented - implement refreshAccessToken()')
  );
}

export function revokeSessionToken(
  _accessToken: string,
  _env?: Env
): Promise<void> {
  return Promise.reject(
    new Error('Not implemented - implement revokeSessionToken()')
  );
}

export function revokeAllUserSessionsByToken(
  _accessToken: string,
  _env?: Env
): Promise<void> {
  return Promise.reject(
    new Error('Not implemented - implement revokeAllUserSessionsByToken()')
  );
}

export function getCurrentUserFromToken(
  _accessToken: string,
  _env?: Env
): Promise<{ user: User; session: Session } | null> {
  return Promise.reject(
    new Error('Not implemented - implement getCurrentUserFromToken()')
  );
}

export function generateAccessToken(
  _userId: string,
  _sessionId: string,
  _env?: Env
): Promise<string> {
  return Promise.reject(
    new Error('Not implemented - implement generateAccessToken()')
  );
}

export function generateRefreshToken(
  _userId: string,
  _sessionId: string,
  _tokenId: string,
  _env?: Env
): Promise<string> {
  return Promise.reject(
    new Error('Not implemented - implement generateRefreshToken()')
  );
}

export function verifyAccessToken(
  _token: string,
  _env?: Env
): Promise<AccessTokenClaims | null> {
  return Promise.reject(
    new Error('Not implemented - implement verifyAccessToken()')
  );
}

export function verifyRefreshToken(
  _token: string,
  _env?: Env
): Promise<RefreshTokenClaims | null> {
  return Promise.reject(
    new Error('Not implemented - implement verifyRefreshToken()')
  );
}

export function getSession(
  _sessionId: string,
  _env?: Env
): Promise<Session | null> {
  return Promise.reject(new Error('Not implemented - implement getSession()'));
}

export function rotateRefreshToken(
  _session: Session,
  _env?: Env
): Promise<string> {
  return Promise.reject(
    new Error('Not implemented - implement rotateRefreshToken()')
  );
}

export function getUserSessions(
  _userId: string,
  _env?: Env
): Promise<Array<Session & { device: Device }>> {
  return Promise.reject(
    new Error('Not implemented - implement getUserSessions()')
  );
}
