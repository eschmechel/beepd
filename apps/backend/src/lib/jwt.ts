// JWT utilities using Web Crypto API (no external dependencies)

interface JWTPayload {
  sub: number;  // userId
  iat: number;  // issued at (seconds)
  exp: number;  // expiry (seconds)
}

const JWT_EXPIRY_DAYS = 7;
const ALGORITHM = { name: 'HMAC', hash: 'SHA-256' };

/**
 * Base64URL encode (JWT-safe base64)
 */
function base64UrlEncode(data: string | ArrayBuffer): string {
  const str = typeof data === 'string' 
    ? btoa(data)
    : btoa(String.fromCharCode(...new Uint8Array(data)));
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Base64URL decode
 */
function base64UrlDecode(str: string): string {
  const padded = str + '==='.slice(0, (4 - str.length % 4) % 4);
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  return atob(base64);
}

/**
 * Import secret as CryptoKey
 */
async function importKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    ALGORITHM,
    false,
    ['sign', 'verify']
  );
}

/**
 * Sign a JWT token
 */
export async function signToken(userId: number, secret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload: JWTPayload = {
    sub: userId,
    iat: now,
    exp: now + (JWT_EXPIRY_DAYS * 24 * 60 * 60),
  };
  
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  
  const key = await importKey(secret);
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    ALGORITHM,
    key,
    encoder.encode(signingInput)
  );
  
  const encodedSignature = base64UrlEncode(signature);
  return `${signingInput}.${encodedSignature}`;
}

/**
 * Verify and decode a JWT token
 * Returns the userId if valid, null if invalid
 */
export async function verifyToken(token: string, secret: string): Promise<number | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    
    // Verify signature
    const key = await importKey(secret);
    const encoder = new TextEncoder();
    
    // Decode signature from base64url
    const signatureStr = base64UrlDecode(encodedSignature);
    const signatureBytes = new Uint8Array(signatureStr.length);
    for (let i = 0; i < signatureStr.length; i++) {
      signatureBytes[i] = signatureStr.charCodeAt(i);
    }
    
    const valid = await crypto.subtle.verify(
      ALGORITHM,
      key,
      signatureBytes,
      encoder.encode(signingInput)
    );
    
    if (!valid) {
      return null;
    }
    
    // Decode and validate payload
    const payload: JWTPayload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);
    
    // Check expiry
    if (payload.exp < now) {
      return null;
    }
    
    return payload.sub;
  } catch {
    return null;
  }
}
