import { Hono } from 'hono';

import { readJsonBody } from '@/lib/validation';
import type { AppContext } from '@/routes/v1/_types';
import * as schemas from '@/routes/v1/schemas';

export const authRoutes = new Hono();

export async function postAuthStart(c: AppContext) {
  // TODO (docs/SPEC.md + TODO.md Phase 4):
  // 1) Parse and validate body: { identifier: string }
  const { identifier } = await readJsonBody(c, schemas.authStartRequestSchema);
  // 2) Detect + normalize identifier:
  //    - if contains '@' => email: trim + lowercase
  //    - else => phone: require E.164 (leading '+', do not guess region)
  // 3) Rate limit / enforce resend cooldown:
  //    - OTP_RESEND_COOLDOWN_SECONDS (default 30s)
  //    - Recommended now: enforce resendAvailableAt based on latest unconsumed challenge
  //    - Later: add KV rate limits (per-IP and per-identifier hash)
  // 4) Create otp_challenges row:
  //    - identifier_type/value
  //    - purpose='login'
  //    - code_hash (never store plaintext OTP)
  //    - attempt_count = 0
  //    - expires_at = now + OTP_CODE_TTL_SECONDS (default 5m)
  //    - resend_available_at = now + OTP_RESEND_COOLDOWN_SECONDS
  // 5) Send OTP via email/SMS provider
  //    - DO NOT leak whether identifier exists
  //    - DO NOT leak deliverability/provider errors to the client
  // 6) Return a generic success response (ok: true)
  return c.json({ error: 'Not implemented' }, 501);
}

export async function postAuthVerify(c: AppContext) {
  // TODO (docs/SPEC.md + TODO.md Phase 4):
  // 1) Parse and validate body:
  const body = await readJsonBody(c, schemas.authVerifyRequestSchema);
  // 2) Normalize identifier (same as /start)
  // 3) Load latest unconsumed otp_challenges for identifier (purpose='login')
  // 4) Enforce expires_at and attempt_count < OTP_MAX_VERIFY_ATTEMPTS (default 5)
  // 5) Constant-time compare provided code vs code_hash
  //    - verify by hashing the provided code (same scheme used in /start) and comparing
  // 6) On success: mark consumed_at
  //    On failure:
  //    - increment attempt_count
  //    - if attempt_count reaches max: set consumed_at (require new challenge)
  // 7) Find or create user + identity:
  //    - lookup user_identities(type,value)
  //    - if missing: create users row + create user_identities row
  //    - ensure verifiedAt is set (idempotent)
  //    - IMPORTANT: if UNIQUE(type,value) conflicts, return generic auth failure
  // 8) Upsert device in devices table
  //    - set lastSeenAt
  //    - update pushToken/platform
  // 9) Create/update sessions row (one per device) with:
  //    - refresh_token_hash
  //    - expires_at = now + AUTH_REFRESH_TOKEN_TTL_SECONDS
  //    - revoked_at = NULL
  //    - updated_at bumped
  // 10) Issue tokens (docs/SPEC.md "Token Strategy"):
  //    - Access: JWS signed JWT (AUTH_ACCESS_TOKEN_TTL_SECONDS)
  //    - Refresh: JWE encrypted JWT (AUTH_REFRESH_TOKEN_TTL_SECONDS)
  // 11) Set refresh token HttpOnly cookie
  // 12) Return access token + user/session/device info
  return c.json({ error: 'Not implemented' }, 501);
}

export async function postAuthRefresh(c: AppContext) {
  // TODO (docs/SPEC.md "Refresh rotation"):
  // 1) Read refresh token from HttpOnly cookie
  // 2) Decrypt/validate refresh JWE and extract userId/sessionId/deviceId
  // 3) Load sessions row
  // 4) Compare refresh token hash with sessions.refresh_token_hash
  // 5) If mismatch => reuse detected => revoke entire session (revoked_at) and reject
  // 6) Rotate refresh token:
  //    - issue new refresh token
  //    - update DB hash + updated_at
  //    - set new cookie
  // 7) Issue new access token and return it
  // Notes:
  // - Also reject if sessions.revoked_at is set or sessions.expires_at passed
  return c.json({ error: 'Not implemented' }, 501);
}

export async function postAuthLogout(c: AppContext) {
  // TODO:
  // 1) Authenticate user (access token)
  // 2) Revoke current session (set revoked_at)
  // 3) Clear refresh cookie
  // 4) Return ok: true
  return c.json({ error: 'Not implemented' }, 501);
}

export async function getAuthMe(c: AppContext) {
  // TODO:
  // 1) Authenticate user (access token)
  // 2) Load user row + session row + device row
  // 3) Return current user + session/device info
  return c.json({ error: 'Not implemented' }, 501);
}

authRoutes.post('/start', postAuthStart);
authRoutes.post('/verify', postAuthVerify);
authRoutes.post('/refresh', postAuthRefresh);
authRoutes.post('/logout', postAuthLogout);
authRoutes.get('/me', getAuthMe);
