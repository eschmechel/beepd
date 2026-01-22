import { z } from "zod";

const envSchema = z.object({
  APP_ENV: z.enum(["dev", "staging", "prod"]).default("dev"),
  CORS_ALLOWED_ORIGINS: z
    .string()
    .optional()
    .default("")
    .transform((value) =>
      value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional().default("info"),

  // Auth/OTP vars will be added here as they become required in Phase 4.
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(raw: unknown): Env {
  return envSchema.parse(raw);
}
