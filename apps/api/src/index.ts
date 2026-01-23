import { Hono } from 'hono';

import { parseEnv, type Env } from '@/env';
import { asErrorResponse, errors } from '@/lib/errors';
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

app.onError((err, c) => asErrorResponse(c, err));
app.notFound((c) => errors.notFound(c));

app.get('/healthz', (c) => c.json({ ok: true, service: 'beepd-api' }));

app.get('/readyz', async (c) => {
  try {
    await c.env.DB.prepare('SELECT 1').first();
    return c.json({ ok: true, service: 'beepd-api' });
  } catch {
    return c.json({ error: 'Service unavailable' }, 503 as const);
  }
});

app.route('/v1', v1Routes);

export default app;
