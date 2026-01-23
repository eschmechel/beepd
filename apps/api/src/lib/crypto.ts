import { base64url } from 'jose';

export async function sha256Base64Url(input: string | Uint8Array) {
  const bytes =
    typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const digest = await crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return base64url.encode(new Uint8Array(digest));
}

// Convenience helper for storing hashes of bearer/refresh tokens in D1.
// Caller decides what tokens to hash and when.
export async function hashTokenForStorage(token: string) {
  return await sha256Base64Url(token);
}

export async function pbkdf2Sha256Base64Url(options: {
  password: string;
  salt: string;
  iterations: number;
  lengthBytes: number;
}) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(options.password) as BufferSource,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: new TextEncoder().encode(options.salt) as BufferSource,
      iterations: options.iterations,
    },
    key,
    options.lengthBytes * 8
  );

  return base64url.encode(new Uint8Array(bits));
}

export function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
