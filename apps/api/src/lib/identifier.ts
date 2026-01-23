import { ApiError } from '@/lib/errors';

export type IdentifierType = 'email' | 'phone';

export function parseIdentifier(raw: string): {
  type: IdentifierType;
  value: string;
} {
  const identifier = raw.trim();
  if (!identifier) throw new ApiError(400, 'Invalid identifier');

  if (identifier.includes('@')) {
    // email: trim + lowercase
    const value = identifier.toLowerCase();
    // Minimal sanity check; full RFC validation is intentionally avoided.
    if (!value.includes('@') || value.startsWith('@') || value.endsWith('@')) {
      throw new ApiError(400, 'Invalid identifier');
    }
    return { type: 'email', value };
  }

  // phone: require E.164 with leading +, do not guess region
  const value = identifier;
  if (!/^\+[1-9]\d{1,14}$/.test(value)) {
    throw new ApiError(400, 'Invalid identifier');
  }
  return { type: 'phone', value };
}
