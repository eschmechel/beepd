import { Hono } from "hono";

import type { AppContext } from "@/routes/v1/_types";

export const authRoutes = new Hono();

export async function postAuthStart(c: AppContext) {
	// TODO:
	// 1) Parse and validate body: { identifier: string }
	// 2) Normalize identifier (email: trim+lowercase, phone: require E.164)
	// 3) Enforce resend cooldown (OTP_RESEND_COOLDOWN_SECONDS)
	// 4) Create otp_challenges row with:
	//    - identifier_type/value
	//    - code_hash (never store plaintext)
	//    - expires_at (now + OTP_CODE_TTL_SECONDS)
	//    - resend_available_at (now + OTP_RESEND_COOLDOWN_SECONDS)
	//    - attempt_count = 0
	// 5) Send OTP via provider (email or sms) WITHOUT leaking whether identifier exists
	// 6) Return a generic success response
	return c.json({ error: "Not implemented" }, 501);
}

export async function postAuthVerify(c: AppContext) {
	// TODO:
	// 1) Parse and validate body: { identifier: string; code: string; device: {...} }
	// 2) Normalize identifier, validate code format (6 digits)
	// 3) Look up latest unconsumed otp_challenges row for identifier
	// 4) Enforce expiry + max attempts (OTP_MAX_VERIFY_ATTEMPTS)
	// 5) Compare code hash (constant-time)
	// 6) Mark challenge consumed
	// 7) Find existing user by identity (user_identities where type/value)
	//    - If none: create user row + create identity row with verified_at
	//    - If exists but not verified: set verified_at
	// 8) Upsert device (one session per device)
	// 9) Create/update sessions row for device with new refresh_token_hash
	// 10) Issue access token + set refresh cookie (HttpOnly)
	return c.json({ error: "Not implemented" }, 501);
}

export async function postAuthRefresh(c: AppContext) {
	// TODO:
	// 1) Read refresh token from HttpOnly cookie
	// 2) Validate/parse token, find session by device/session id
	// 3) Compare refresh_token_hash
	// 4) Rotate refresh token: update hash in DB, set new cookie
	// 5) Issue new access token
	// 6) If refresh reuse detected: revoke session
	return c.json({ error: "Not implemented" }, 501);
}

export async function postAuthLogout(c: AppContext) {
	// TODO:
	// 1) Authenticate user (access token)
	// 2) Find session for current device
	// 3) Mark revoked_at and clear refresh cookie
	return c.json({ error: "Not implemented" }, 501);
}

export async function getAuthMe(c: AppContext) {
	// TODO:
	// 1) Authenticate user (access token)
	// 2) Return user + session/device summary
	return c.json({ error: "Not implemented" }, 501);
}

authRoutes.post("/start", postAuthStart);
authRoutes.post("/verify", postAuthVerify);
authRoutes.post("/refresh", postAuthRefresh);
authRoutes.post("/logout", postAuthLogout);
authRoutes.get("/me", getAuthMe);
