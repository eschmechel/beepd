import { Hono } from 'hono';

import { parseEnv, type Env } from '@/env';
import { v1Routes } from '@/routes/v1';

const app = new Hono<{
  Variables: {
    env: Env;
  };
  Bindings: {
    DB: D1Database;
  } & Record<string, unknown>;
}>();

app.use('*', async (c, next) => {
  c.set('env', parseEnv(c.env));
  await next();
});

app.get('/healthz', (c) => c.json({ ok: true, service: 'beepd-api' }));

app.route('/v1', v1Routes);

export default app;
