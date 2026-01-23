import { EncryptJWT, SignJWT, base64url, jwtDecrypt, jwtVerify } from 'jose';

import { ApiError } from '@/lib/errors';

export type AccessTokenPayload = {
  sub: string;
  sid: string;
  did: string;
};

export type RefreshTokenPayload = {
  sub: string;
  sid: string;
  did: string;
};

function requireSigningSecret(env: { AUTH_JWT_SIGNING_SECRET?: string }) {
  if (!env.AUTH_JWT_SIGNING_SECRET) {
    throw new ApiError(500, 'Auth misconfigured');
  }
  return new TextEncoder().encode(env.AUTH_JWT_SIGNING_SECRET);
}

async function requireRefreshKey(env: {
  AUTH_REFRESH_TOKEN_ENCRYPTION_KEY?: string;
}) {
  if (!env.AUTH_REFRESH_TOKEN_ENCRYPTION_KEY) {
    throw new ApiError(500, 'Auth misconfigured');
  }

  // Prefer a base64url-encoded 32-byte key for A256GCM. For local dev
  // convenience, also accept an arbitrary string and derive a 32-byte key
  // via SHA-256.
  try {
    return base64url.decode(env.AUTH_REFRESH_TOKEN_ENCRYPTION_KEY);
  } catch {
    const digest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(
        env.AUTH_REFRESH_TOKEN_ENCRYPTION_KEY
      ) as BufferSource
    );
    return new Uint8Array(digest);
  }
}

export async function signAccessToken(options: {
  env: { AUTH_JWT_SIGNING_SECRET?: string };
  userId: string;
  sessionId: string;
  deviceId: string;
  ttlSeconds: number;
}) {
  const secret = requireSigningSecret(options.env);

  return await new SignJWT({ sid: options.sessionId, did: options.deviceId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(options.userId)
    .setIssuedAt()
    .setExpirationTime(`${options.ttlSeconds}s`)
    .sign(secret);
}

export async function verifyAccessToken(options: {
  env: { AUTH_JWT_SIGNING_SECRET?: string };
  token: string;
}): Promise<AccessTokenPayload> {
  const secret = requireSigningSecret(options.env);
  const { payload } = await jwtVerify(options.token, secret);

  if (typeof payload.sub !== 'string') throw new ApiError(401, 'Unauthorized');
  if (typeof payload.sid !== 'string') throw new ApiError(401, 'Unauthorized');
  if (typeof payload.did !== 'string') throw new ApiError(401, 'Unauthorized');

  return { sub: payload.sub, sid: payload.sid, did: payload.did };
}

export async function encryptRefreshToken(options: {
  env: { AUTH_REFRESH_TOKEN_ENCRYPTION_KEY?: string };
  userId: string;
  sessionId: string;
  deviceId: string;
  ttlSeconds: number;
}) {
  const key = await requireRefreshKey(options.env);

  return await new EncryptJWT({ sid: options.sessionId, did: options.deviceId })
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setSubject(options.userId)
    .setIssuedAt()
    .setExpirationTime(`${options.ttlSeconds}s`)
    .encrypt(key);
}

export async function decryptRefreshToken(options: {
  env: { AUTH_REFRESH_TOKEN_ENCRYPTION_KEY?: string };
  token: string;
}): Promise<RefreshTokenPayload> {
  const key = await requireRefreshKey(options.env);
  const { payload } = await jwtDecrypt(options.token, key);

  if (typeof payload.sub !== 'string') throw new ApiError(401, 'Unauthorized');
  if (typeof payload.sid !== 'string') throw new ApiError(401, 'Unauthorized');
  if (typeof payload.did !== 'string') throw new ApiError(401, 'Unauthorized');

  return { sub: payload.sub, sid: payload.sid, did: payload.did };
}
