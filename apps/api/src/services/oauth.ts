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

/**
 * Supported OAuth providers for v0.1
 */
export type OAuthProvider = 'google' | 'github';

/**
 * Provider configuration
 */
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

/**
 * OAuth state token with metadata
 */
export interface OauthState {
  provider: OAuthProvider;
  redirectUri: string;
  purpose: 'login' | 'link';
  userId?: string; // Present if purpose='link'
}

/**
 * User info returned from provider after token exchange
 */
export interface ProviderUserInfo {
  provider: OAuthProvider;
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  displayName?: string;
  avatarUrl?: string;
}

/**
 * Result of OAuth callback verification
 */
export interface OauthVerifyResult {
  user: User;
  identity: UserIdentity;
  sessionToken: string;
  sessionExpiresAt: Date;
}

/**
 * Generate OAuth authorization URL for a provider
 *
 * TODO Flow:
 * 1. Validate provider is supported (google|github)
 * 2. Generate random state token (crypto.randomUUID)
 * 3. Store state in oauth_states table with:
 *    - provider, state, redirect_uri, expires_at (15 min)
 *    - purpose ('login' or 'link'), userId if linking
 * 4. Build authorization URL with:
 *    - client_id from env
 *    - redirect_uri (env.OAUTH_REDIRECT_URI + /v1/auth/callback)
 *    - response_type=code
 *    - scope (provider-specific, space-separated)
 *    - state (generated state token)
 *    - access_type=offline (Google only, for refresh tokens)
 *    - prompt=consent (force consent to get refresh token)
 * 5. Return { url, state }
 *
 * @param provider - OAuth provider ('google'|'github')
 * @param redirectUri - Where to redirect after provider auth
 * @param purpose - 'login' for signin, 'link' for linking existing account
 * @param userId - Required if purpose='link', the user to link to
 * @param env - Environment bindings
 * @returns Authorization URL and state token info
 */
export async function getAuthorizationUrl(
  provider: OAuthProvider,
  redirectUri: string,
  purpose: 'login' | 'link',
  userId?: string,
  env?: Env
): Promise<{ url: string; state: string }> {
  throw new Error('Not implemented - implement getAuthorizationUrl()');
}

/**
 * Handle OAuth callback and exchange code for tokens
 *
 * TODO Flow:
 * 1. Validate state parameter is present
 * 2. Look up state in oauth_states table
 *    - Must exist, not expired, not consumed
 *    - Mark as consumed (delete or mark used)
 * 3. Validate code parameter is present
 * 4. Exchange code for access token:
 *    - POST to provider's tokenUrl
 *    - Body: grant_type=authorization_code, code, redirect_uri, client_id, client_secret
 *    - Headers: Accept: application/json
 *    - Parse JSON response
 * 5. If error or no access_token, throw AuthError
 * 6. Fetch user info with access_token:
 *    - GET provider's userInfoUrl
 *    - Authorization: Bearer {access_token}
 *    - Parse email, name, avatar from response
 * 7. Normalize email (lowercase, trim)
 * 8. Find existing identity by (provider, providerUserId)
 *    - If found: get associated user
 *    - If not found: find identity by email (linking)
 *      - If email identity exists: create new identity linked to same user
 *      - If no email identity: create new user + identity
 * 9. Create session for user
 * 10. Return { user, identity, sessionToken, sessionExpiresAt }
 *
 * @param provider - OAuth provider
 * @param code - Authorization code from provider callback
 * @param state - State token from provider callback
 * @param env - Environment bindings
 * @returns User, identity, and session info
 */
export async function handleOauthCallback(
  provider: OAuthProvider,
  code: string,
  state: string,
  env?: Env
): Promise<OauthVerifyResult> {
  throw new Error('Not implemented - implement handleOauthCallback()');
}

/**
 * Exchange access token for user info from provider
 *
 * TODO Flow:
 * 1. Build request to provider's userInfoUrl
 * 2. Add Authorization: Bearer {accessToken} header
 * 3. Fetch and parse JSON response
 * 4. Map provider-specific fields to ProviderUserInfo:
 *    - Google: email, email_verified, name, picture
 *    - GitHub: email (may need second request for email if private),
 *              name, avatar_url
 * 5. If email not available and provider=github, fetch emails endpoint
 * 6. Return normalized ProviderUserInfo
 *
 * @param provider - OAuth provider
 * @param accessToken - Access token from token exchange
 * @returns User info from provider
 */
export async function fetchProviderUserInfo(
  provider: OAuthProvider,
  accessToken: string
): Promise<ProviderUserInfo> {
  throw new Error('Not implemented - implement fetchProviderUserInfo()');
}

/**
 * Exchange authorization code for access token
 *
 * TODO Flow:
 * 1. Build POST request to provider's tokenUrl
 * 2. Body:
 *    - grant_type=authorization_code
 *    - code
 *    - redirect_uri
 *    - client_id
 *    - client_secret
 * 3. Headers: Content-Type: application/x-www-form-urlencoded, Accept: application/json
 * 4. Send request, parse JSON response
 * 5. Return { accessToken, tokenType, expiresIn, refreshToken?, scope? }
 *
 * @param provider - OAuth provider
 * @param code - Authorization code
 * @param redirectUri - Redirect URI (must match original request)
 * @param env - Environment bindings
 * @returns Token response from provider
 */
export async function exchangeCodeForToken(
  provider: OAuthProvider,
  code: string,
  redirectUri: string,
  env?: Env
): Promise<{
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  refreshToken?: string;
  scope?: string;
}> {
  throw new Error('Not implemented - implement exchangeCodeForToken()');
}

/**
 * Build provider-specific authorization URL
 *
 * TODO Flow:
 * 1. Get provider config from OAUTH_PROVIDERS
 * 2. Construct URLSearchParams:
 *    - client_id (env.{PROVIDER}_CLIENT_ID)
 *    - redirect_uri (redirectUri)
 *    - response_type=code
 *    - scope (join with spaces)
 *    - state
 *    - access_type=offline (Google only)
 *    - prompt=consent (Google only)
 * 3. Return full URL string
 *
 * @param provider - OAuth provider
 * @param clientId - OAuth client ID
 * @param redirectUri - Redirect URI after auth
 * @param state - State token for CSRF protection
 * @returns Full authorization URL
 */
export function buildAuthUrl(
  provider: OAuthProvider,
  clientId: string,
  redirectUri: string,
  state: string
): string {
  throw new Error('Not implemented - implement buildAuthUrl()');
}

/**
 * Find or create user and identity from provider user info
 *
 * TODO Flow:
 * 1. Try find identity by (provider, providerUserId)
 *    - If found: return existing user + identity
 * 2. Try find identity by email (any type: email|oauth)
 *    - If found: this is account linking - create new identity for same user
 *    - Create identity with provider, providerUserId, email, verified_at=now
 *    - Return user + new identity
 * 3. If no email identity exists:
 *    - Create new user with:
 *      - display_name: from provider or email prefix
 *      - avatar_url: from provider if available
 *    - Create identity linked to new user
 *    - Return user + identity
 *
 * @param providerUserInfo - User info from provider
 * @param env - Environment bindings
 * @returns { user, identity }
 */
export async function findOrCreateUserFromProvider(
  providerUserInfo: ProviderUserInfo,
  env?: Env
): Promise<{ user: User; identity: UserIdentity }> {
  throw new Error('Not implemented - implement findOrCreateUserFromProvider()');
}

/**
 * Validate OAuth state token
 *
 * TODO Flow:
 * 1. Query oauth_states for row with matching state
 * 2. If not found: throw AuthError('invalid_state')
 * 3. If expired (expires_at < now): throw AuthError('state_expired')
 * 4. If already consumed: throw AuthError('state_used')
 * 5. Return state record
 *
 * @param state - State token from callback
 * @param env - Environment bindings
 * @returns OauthState record
 */
export async function validateOauthState(
  state: string,
  env?: Env
): Promise<OauthState> {
  throw new Error('Not implemented - implement validateOauthState()');
}

/**
 * Consume OAuth state after successful callback
 *
 * TODO Flow:
 * 1. Delete state record from oauth_states table
 *    - Prevents replay attacks
 * 2. Return void
 *
 * @param state - State token to consume
 * @param env - Environment bindings
 */
export async function consumeOauthStateToken(
  state: string,
  env?: Env
): Promise<void> {
  throw new Error('Not implemented - implement consumeOauthStateToken()');
}

/**
 * Generate state token for OAuth flow
 *
 * TODO Flow:
 * 1. Generate random string (32+ chars, use crypto.randomUUID or randomBytes)
 * 2. Insert into oauth_states table with:
 *    - id: crypto.randomUUID()
 *    - provider
 *    - state: generated token
 *    - redirect_uri
 *    - purpose
 *    - user_id (if linking)
 *    - expires_at: now + 15 minutes
 *    - created_at: now
 * 3. Return state token
 *
 * @param stateData - State metadata
 * @param env - Environment bindings
 * @returns Generated state token
 */
export async function createOauthStateToken(
  stateData: OauthState,
  env?: Env
): Promise<string> {
  throw new Error('Not implemented - implement createOauthStateToken()');
}

/**
 * Revoke OAuth access token (logout from provider)
 *
 * TODO Flow:
 * 1. If provider supports revocation endpoint:
 *    - Google: https://oauth2.googleapis.com/revoke
 *    - GitHub: Not supported (no revocation endpoint)
 * 2. POST token to revocation endpoint
 * 3. Ignore errors (user may have already revoked, etc)
 *
 * @param provider - OAuth provider
 * @param accessToken - Token to revoke
 * @param env - Environment bindings
 */
export async function revokeOauthToken(
  provider: OAuthProvider,
  accessToken: string,
  env?: Env
): Promise<void> {
  throw new Error('Not implemented - implement revokeOauthToken()');
}
