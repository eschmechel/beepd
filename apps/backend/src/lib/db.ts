import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../db/schema';

// Create Drizzle client from D1 binding
export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

// Type helper for the database client
export type Database = ReturnType<typeof createDb>;
