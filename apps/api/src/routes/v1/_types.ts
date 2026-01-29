import type { Context } from 'hono';

import type { Env } from '@/env';

export type AppEnv = {
  Bindings: {
    DB: D1Database;
  } & Record<string, unknown>;
  Variables: {
    // Filled by env middleware in src/index.ts
    env: Env;

    // Filled by request middleware in src/index.ts
    requestId: string;

    // Filled by auth middleware when present
    userId?: string;
    sessionId?: string;
    deviceId?: string;
  };
};

export type AppContext = Context<AppEnv>;
