import type { Context } from 'hono';

import type { Env } from '@/env';

export type AppEnv = {
  Bindings: {
    DB: D1Database;
  } & Record<string, unknown>;
  Variables: {
    // Filled by env middleware in src/index.ts
    env: Env;
  };
};

export type AppContext = Context<AppEnv>;
