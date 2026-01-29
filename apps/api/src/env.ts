import { z } from 'zod';

export interface Env {
  // Bindings (Cloudflare-specific)
  KV: KVNamespace;
  DB: D1Database;

  // Environment Variables
  APP_ENV: 'dev' | 'staging' | 'prod';
  CORS_ALLOWED_ORIGINS: string[];
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';

  // Auth/session secrets
  SESSION_SECRET: string;

  // Auth knobs
  AUTH_ACCESS_TOKEN_TTL_SECONDS: number;
  AUTH_REFRESH_TOKEN_TTL_SECONDS: number;

  // OTP provider secrets
  RESEND_API_KEY: string;

  // Stubbed SMS provider (v1.1)
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_FROM_NUMBER: string;

  // OAuth providers
  OAUTH_GOOGLE_CLIENT_ID: string;
  OAUTH_GOOGLE_CLIENT_SECRET: string;
  OAUTH_GITHUB_CLIENT_ID: string;
  OAUTH_GITHUB_CLIENT_SECRET: string;

  // Deferred to v1.2
  OAUTH_MICROSOFT_CLIENT_ID: string;
  OAUTH_MICROSOFT_CLIENT_SECRET: string;
  OAUTH_APPLE_CLIENT_ID: string;
  OAUTH_APPLE_TEAM_ID: string;
  OAUTH_APPLE_KEY_ID: string;
  OAUTH_APPLE_PRIVATE_KEY: string;

  // Rate limiting (KV-based)
  RATE_LIMIT_IDENTIFIER_MAX: number;
  RATE_LIMIT_IDENTIFIER_WINDOW_SECONDS: number;
  RATE_LIMIT_IP_MAX: number;
  RATE_LIMIT_IP_WINDOW_SECONDS: number;
}

const envSchema = z.object({
  // Environment Variables
  APP_ENV: z.enum(['dev', 'staging', 'prod']).default('dev'),
  CORS_ALLOWED_ORIGINS: z
    .string()
    .optional()
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    ),
  LOG_LEVEL: z
    .enum(['debug', 'info', 'warn', 'error'])
    .optional()
    .default('info'),

  // Auth/session secrets
  SESSION_SECRET: z.string().optional(),

  // Auth knobs
  AUTH_ACCESS_TOKEN_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .default(15 * 60),
  AUTH_REFRESH_TOKEN_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .default(30 * 24 * 60 * 60),

  // OTP provider secrets
  RESEND_API_KEY: z.string().optional(),

  // Stubbed SMS provider (v1.1)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),

  // OAuth providers
  OAUTH_GOOGLE_CLIENT_ID: z.string().optional(),
  OAUTH_GOOGLE_CLIENT_SECRET: z.string().optional(),
  OAUTH_GITHUB_CLIENT_ID: z.string().optional(),
  OAUTH_GITHUB_CLIENT_SECRET: z.string().optional(),

  // Deferred to v1.2
  OAUTH_MICROSOFT_CLIENT_ID: z.string().optional(),
  OAUTH_MICROSOFT_CLIENT_SECRET: z.string().optional(),
  OAUTH_APPLE_CLIENT_ID: z.string().optional(),
  OAUTH_APPLE_TEAM_ID: z.string().optional(),
  OAUTH_APPLE_KEY_ID: z.string().optional(),
  OAUTH_APPLE_PRIVATE_KEY: z.string().optional(),

  // Rate limiting (KV-based)
  RATE_LIMIT_IDENTIFIER_MAX: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .default(5),
  RATE_LIMIT_IDENTIFIER_WINDOW_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .default(3600),
  RATE_LIMIT_IP_MAX: z.coerce.number().int().positive().optional().default(4),
  RATE_LIMIT_IP_WINDOW_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .default(60),
});

export function parseEnv(raw: unknown): Env {
  const parsed = envSchema.parse(raw);
  return {
    ...parsed,
    KV: {} as KVNamespace, // Placeholder - actual binding comes from wrangler
    DB: {} as D1Database, // Placeholder - actual binding comes from wrangler
  } as Env;
}
