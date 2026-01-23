import { z } from 'zod';

const envSchema = z.object({
  //Enviroment Variables
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
  AUTH_JWT_SIGNING_SECRET: z.string().optional(),
  AUTH_REFRESH_TOKEN_ENCRYPTION_KEY: z.string().optional(),

  // Optional auth knobs
  AUTH_ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().optional(),
  AUTH_REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().optional(),

  // OTP providers
  OTP_EMAIL_PROVIDER: z.string().optional(),
  OTP_SMS_PROVIDER: z.string().optional(),

  // Optional OTP knobs
  OTP_CODE_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .default(300),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .default(30),
  OTP_MAX_VERIFY_ATTEMPTS: z.coerce.number().int().min(1).optional().default(5),

  // Example provider secrets
  RESEND_API_KEY: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(raw: unknown): Env {
  return envSchema.parse(raw);
}
