import { defineConfig } from 'drizzle-kit';

const getEnv = (key: string, fallback = ''): string => {
  const value = process.env[key];
  return value ?? fallback;
};

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'd1-http',
  // drizzle-kit can generate migrations without connecting, but push/pull
  // against a remote D1 database require these env vars.
  dbCredentials: {
    accountId: getEnv('CLOUDFLARE_ACCOUNT_ID'),
    databaseId: getEnv('CLOUDFLARE_DATABASE_ID'),
    token: getEnv('CLOUDFLARE_D1_TOKEN'),
  },
});
