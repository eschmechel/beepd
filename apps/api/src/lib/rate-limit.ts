import type { Env } from '@/env';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

interface RateLimitData {
  count: number;
  resetAt: number;
}

function parseRateLimitData(data: unknown): data is RateLimitData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'count' in data &&
    'resetAt' in data &&
    typeof (data as Record<string, unknown>).count === 'number' &&
    typeof (data as Record<string, unknown>).resetAt === 'number'
  );
}

export async function checkRateLimit(
  env: Env,
  type: 'identifier' | 'ip',
  key: string
): Promise<RateLimitResult> {
  const max =
    type === 'identifier'
      ? env.RATE_LIMIT_IDENTIFIER_MAX
      : env.RATE_LIMIT_IP_MAX;
  const windowSeconds =
    type === 'identifier'
      ? env.RATE_LIMIT_IDENTIFIER_WINDOW_SECONDS
      : env.RATE_LIMIT_IP_WINDOW_SECONDS;
  const kvKey = `ratelimit:${type}:${key}`;

  const raw = await env.KV.get(kvKey, { type: 'json' });
  const current = parseRateLimitData(raw) ? raw : null;

  if (current && Date.now() < current.resetAt) {
    const remaining = Math.max(0, max - current.count);
    if (remaining <= 0) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: current.resetAt,
      };
    }
    return {
      allowed: true,
      remaining,
      resetAt: current.resetAt,
    };
  }

  const resetAt = Date.now() + windowSeconds * 1000;
  await env.KV.put(kvKey, JSON.stringify({ count: 1, resetAt }), {
    expirationTtl: Math.ceil(windowSeconds / 1000) + 60,
  });

  return {
    allowed: true,
    remaining: max - 1,
    resetAt,
  };
}

export async function incrementRateLimit(
  env: Env,
  type: 'identifier' | 'ip',
  key: string
): Promise<void> {
  const windowSeconds =
    type === 'identifier'
      ? env.RATE_LIMIT_IDENTIFIER_WINDOW_SECONDS
      : env.RATE_LIMIT_IP_WINDOW_SECONDS;
  const kvKey = `ratelimit:${type}:${key}`;

  const raw = await env.KV.get(kvKey, { type: 'json' });
  const current = parseRateLimitData(raw) ? raw : null;

  if (current && Date.now() < current.resetAt) {
    await env.KV.put(
      kvKey,
      JSON.stringify({ count: current.count + 1, resetAt: current.resetAt }),
      { expirationTtl: Math.ceil(windowSeconds / 1000) + 60 }
    );
  } else {
    const resetAt = Date.now() + windowSeconds * 1000;
    await env.KV.put(kvKey, JSON.stringify({ count: 1, resetAt }), {
      expirationTtl: Math.ceil(windowSeconds / 1000) + 60,
    });
  }
}

export async function getRateLimitRemaining(
  env: Env,
  type: 'identifier' | 'ip',
  key: string
): Promise<number> {
  const max =
    type === 'identifier'
      ? env.RATE_LIMIT_IDENTIFIER_MAX
      : env.RATE_LIMIT_IP_MAX;
  const kvKey = `ratelimit:${type}:${key}`;

  const raw = await env.KV.get(kvKey, { type: 'json' });
  const current = parseRateLimitData(raw) ? raw : null;

  if (!current || Date.now() >= current.resetAt) {
    return max;
  }

  return Math.max(0, max - current.count);
}

export function hashIdentifier(identifier: string): string {
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    const char = identifier.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
