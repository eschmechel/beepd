/**
 * OTP Service
 *
 * Handles OTP code generation, hashing, and email delivery for passwordless auth.
 * Used by auth routes for login and identity linking flows.
 *
 * Configuration (hardcoded — change requires deployment):
 * - CODE_LENGTH: 6 characters
 * - CODE_CHARS: Alphanumeric excluding confusing chars (I, O, 1, 0)
 * - CODE_LIFETIME_MS: 5 minutes
 * - RESEND_COOLDOWN_MS: 60 seconds
 * - MAX_ATTEMPTS: 5 per challenge
 */

import bcrypt from 'bcryptjs';
import { Resend } from 'resend';
import type { Env } from '@/env';
import { hashIdentifier, checkRateLimit } from '@/lib/rate-limit';
import {
  createOtpChallenge,
  findValidOtpChallenge,
  consumeOtpChallenge,
  incrementOtpAttempt,
  getOtpChallenge,
} from '@/db/queries/auth';

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

const CODE_LENGTH = 6;
const CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export const CODE_LIFETIME_MS = 5 * 60 * 1000;
export const RESEND_COOLDOWN_MS = 60 * 1000;
export const MAX_ATTEMPTS = 5;

// -----------------------------------------------------------------------------
// Resend Client (lazy singleton)
// -----------------------------------------------------------------------------

let resendClient: Resend | null = null;

function getResendClient(env: Env): Resend {
  if (!resendClient && env.RESEND_API_KEY) {
    resendClient = new Resend(env.RESEND_API_KEY);
  }
  if (!resendClient) {
    throw new Error('RESEND_API_KEY not configured');
  }
  return resendClient;
}

// -----------------------------------------------------------------------------
// Code Generation & Hashing
// -----------------------------------------------------------------------------

/** Generate a random OTP code (6 chars, alphanumeric, no confusing chars). */
export function generateCode(): string {
  const random = new Uint32Array(CODE_LENGTH);
  crypto.getRandomValues(random);
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[random[i] % CODE_CHARS.length];
  }
  return code;
}

/** Constant-time compare a code against its hash. */
export function verifyCodeHash(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code, hash);
}

// -----------------------------------------------------------------------------
// Email Delivery
// -----------------------------------------------------------------------------

/** Send OTP code via Resend. Non-blocking — errors are logged but don't throw. */
export async function sendEmailCode(
  env: Env,
  email: string,
  code: string
): Promise<void> {
  const resend = getResendClient(env);
  await resend.emails.send({
    from: 'Beepd <otp@beepd.tech>',
    to: email,
    subject: 'Your Beepd verification code',
    html: `
      <p>Your verification code is:</p>
      <h1 style="font-size: 32px; letter-spacing: 4px;">${code}</h1>
      <p>This code expires in 5 minutes.</p>
    `,
  });
}

// -----------------------------------------------------------------------------
// SMS Delivery (stubbed for v1.1)
// -----------------------------------------------------------------------------

/** Send OTP code via SMS. Stubbed — implement with Twilio in v1.1. */
// eslint-disable-next-line @typescript-eslint/require-await
export async function sendSmsCode(
  _env: Env,
  _phone: string,
  _code: string
): Promise<void> {
  // TODO (v1.1): Implement with Twilio
  throw new Error('SMS OTP not implemented');
}

// -----------------------------------------------------------------------------
// Main Flow
// -----------------------------------------------------------------------------

export interface OtpStartResult {
  challengeId: string;
  devCode?: string;
  resendAvailableAt: string;
}

export async function startChallenge(
  env: Env,
  email: string,
  purpose: 'login' | 'link',
  ipHash: string
): Promise<OtpStartResult> {
  const normalizedEmail = email.trim().toLowerCase();

  // Hash email for rate limiting (don't expose raw email in KV)
  const emailHash = hashIdentifier(normalizedEmail);

  // Check per-identifier rate limit (5/hour)
  const idResult = await checkRateLimit(env, 'identifier', emailHash);
  if (!idResult.allowed) {
    throw new Error('RATE_LIMIT_EXCEEDED');
  }

  // Check per-IP rate limit (4/min)
  const ipResult = await checkRateLimit(env, 'ip', ipHash);
  if (!ipResult.allowed) {
    throw new Error('RATE_LIMIT_EXCEEDED');
  }

  // Check for existing valid challenge (for retries/resends)
  const existingChallenge = await findValidOtpChallenge(
    env,
    'email',
    normalizedEmail,
    purpose
  );

  if (existingChallenge) {
    const now = Date.now();
    const resendAvailableAt = new Date(
      existingChallenge.resendAvailableAt
    ).getTime();

    if (now < resendAvailableAt) {
      // Within resend cooldown - return existing challenge info
      // Client should use the existing code
      const resendAtStr =
        typeof existingChallenge.resendAvailableAt === 'string'
          ? existingChallenge.resendAvailableAt
          : (existingChallenge.resendAvailableAt?.toISOString() ?? '');

      return {
        challengeId: existingChallenge.id,
        devCode: undefined,
        resendAvailableAt: resendAtStr,
      };
    }

    // Past resend cooldown - create a new challenge
    // The old challenge will naturally expire
  }

  // No existing challenge or past cooldown - create new one
  // Generate code and hash it
  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);

  // Calculate timestamps
  const now = Date.now();
  const expiresAt = new Date(now + CODE_LIFETIME_MS);
  const resendAvailableAt = new Date(now + RESEND_COOLDOWN_MS);

  // Create challenge in DB
  const otp = await createOtpChallenge(env, {
    id: crypto.randomUUID(),
    identifierType: 'email',
    identifierValue: normalizedEmail,
    purpose,
    codeHash,
    attemptCount: 0,
    resendAvailableAt,
    expiresAt,
    consumedAt: null,
    createdAt: new Date(now),
    ipHash,
  });

  if (!otp) {
    throw new Error('FAILED_TO_CREATE_CHALLENGE');
  }

  // Send email (fire-and-forget, errors logged only)
  sendEmailCode(env, normalizedEmail, code).catch((err) => {
    console.error('Failed to send OTP email:', err);
  });

  // Return dev code only in dev mode
  const devCode = env.APP_ENV === 'dev' ? code : undefined;

  // Handle both Date and string from DB
  const resendAtStr =
    typeof otp.resendAvailableAt === 'string'
      ? otp.resendAvailableAt
      : (otp.resendAvailableAt?.toISOString() ?? '');

  return {
    challengeId: otp.id,
    devCode,
    resendAvailableAt: resendAtStr,
  };
}

interface OtpVerifyResult {
  success: boolean;
  challengeId: string;
  userId?: string; // only on success
  accessToken?: string; // only on success
  refreshToken?: string; // only on success
  expiresAt: string;
}

export async function verifyCode(
  env: Env,
  challengeId: string,
  code: string
): Promise<OtpVerifyResult> {
  const foundChallenge = await getOtpChallenge(env, challengeId);

  // Error checking
  if (foundChallenge === null) throw new Error('INVALID_CHALLENGE');

  // Handle Date | string types
  const expiresAtVal = foundChallenge.expiresAt;
  const expiresAtStr =
    typeof expiresAtVal === 'string'
      ? expiresAtVal
      : (expiresAtVal?.toISOString() ?? '');
  const expiresAtDate =
    typeof expiresAtVal === 'string' ? new Date(expiresAtVal) : expiresAtVal;

  const now = Date.now();
  if (expiresAtDate.getTime() < now) throw new Error('CODE_EXPIRED');
  if (foundChallenge.consumedAt) throw new Error('CODE_ALREADY_USED');
  if (foundChallenge.attemptCount >= MAX_ATTEMPTS)
    throw new Error('MAX_ATTEMPTS_EXCEEDED');

  const validHash = await verifyCodeHash(code, foundChallenge.codeHash);

  if (!validHash) {
    await incrementOtpAttempt(env, foundChallenge.id);
    return { success: false, challengeId, expiresAt: expiresAtStr };
  }

  await consumeOtpChallenge(env, challengeId);
  // TODO: findOrCreateUser() <- deferred to auth.ts
  const userId = undefined;
  const accessToken = undefined;

  return {
    success: true,
    challengeId,
    userId,
    accessToken,
    expiresAt: expiresAtStr,
  };
}
