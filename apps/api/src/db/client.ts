import { drizzle } from 'drizzle-orm/d1';

import { schema } from '@/db/schema';

export function getDb(env: { DB: D1Database }) {
  return drizzle(env.DB, { schema });
}

export type Db = ReturnType<typeof getDb>;
