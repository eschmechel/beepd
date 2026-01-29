/**
 * OAuth Service
 *
 * Handles OAuth 2.0 authentication flow for Google and GitHub.
 * Used by auth routes for login and identity linking.
 *
 * Configuration (env vars):
 * - GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
 * - GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET
 * - OAUTH_REDIRECT_URI - Must match registered redirect URIs
 *
 * OAuth Flow:
 * 1. Client calls startOAuth(provider) -> returns auth URL with state
 * 2. User auths with provider -> callback to /v1/auth/verify with code+state
 * 3. Server exchanges code for access token -> fetches user profile
 * 4. Server finds/creates user by email -> creates session
 * 5. Returns tokens to client
 */

import type { Env } from '@/env';
import type { User, UserIdentity } from '@/db/queries/auth';

export type OAuthProvider = 'google' | 'github';

export const OAUTH_PROVIDERS: Record<
  OAuthProvider,
  {
    authUrl: string;
    tokenUrl: string;
    userInfoUrl: string;
    scope: string[];
  }
> = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
    scope: ['openid', 'email', 'profile'],
  },
  github: {
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    scope: ['read:user', 'user:email'],
  },
};

export interface OauthState {
  provider: OAuthProvider;
  redirectUri: string;
  purpose: 'login' | 'link';
  userId?: string;
}

export interface ProviderUserInfo {
  provider: OAuthProvider;
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  displayName?: string;
  avatarUrl?: string;
}

export interface OauthVerifyResult {
  user: User;
  identity: UserIdentity;
  sessionToken: string;
  sessionExpiresAt: Date;
}

export function getAuthorizationUrl(
  _provider: OAuthProvider,
  _redirectUri: string,
  _purpose: 'login' | 'link',
  _userId?: string,
  _env?: Env
): Promise<{ url: string; state: string }> {
  return Promise.reject(
    new Error('Not implemented - implement getAuthorizationUrl()')
  );
}

export function handleOauthCallback(
  _provider: OAuthProvider,
  _code: string,
  _state: string,
  _env?: Env
): Promise<OauthVerifyResult> {
  return Promise.reject(
    new Error('Not implemented - implement handleOauthCallback()')
  );
}

export function fetchProviderUserInfo(
  _provider: OAuthProvider,
  _accessToken: string
): Promise<ProviderUserInfo> {
  return Promise.reject(
    new Error('Not implemented - implement fetchProviderUserInfo()')
  );
}

export function exchangeCodeForToken(
  _provider: OAuthProvider,
  _code: string,
  _redirectUri: string,
  _env?: Env
): Promise<{
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  refreshToken?: string;
  scope?: string;
}> {
  return Promise.reject(
    new Error('Not implemented - implement exchangeCodeForToken()')
  );
}

export function buildAuthUrl(
  _provider: OAuthProvider,
  _clientId: string,
  _redirectUri: string,
  _state: string
): string {
  throw new Error('Not implemented - implement buildAuthUrl()');
}

export function findOrCreateUserFromProvider(
  _providerUserInfo: ProviderUserInfo,
  _env?: Env
): Promise<{ user: User; identity: UserIdentity }> {
  return Promise.reject(
    new Error('Not implemented - implement findOrCreateUserFromProvider()')
  );
}

export function validateOauthState(
  _state: string,
  _env?: Env
): Promise<OauthState> {
  return Promise.reject(
    new Error('Not implemented - implement validateOauthState()')
  );
}

export function consumeOauthStateToken(
  _state: string,
  _env?: Env
): Promise<void> {
  return Promise.reject(
    new Error('Not implemented - implement consumeOauthStateToken()')
  );
}

export function createOauthStateToken(
  _stateData: OauthState,
  _env?: Env
): Promise<string> {
  return Promise.reject(
    new Error('Not implemented - implement createOauthStateToken()')
  );
}

export function revokeOauthToken(
  _provider: OAuthProvider,
  _accessToken: string,
  _env?: Env
): Promise<void> {
  return Promise.reject(
    new Error('Not implemented - implement revokeOauthToken()')
  );
}
