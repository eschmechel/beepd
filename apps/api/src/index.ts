import { Hono } from 'hono';

import { parseEnv, type Env } from '@/env';
import { asErrorResponse, errors } from '@/lib/errors';
import { requestLogger } from '@/lib/log';
import { v1Routes } from '@/routes/v1';
import { healthCheck } from '@/db/queries/system';

const app = new Hono<{
  Variables: {
    env: Env;
    requestId: string;
  };
  Bindings: {
    DB: D1Database;
  } & Record<string, unknown>;
}>();

app.use('*', async (c, next) => {
  c.set('env', parseEnv(c.env));

  const requestId = c.req.header('cf-ray') ?? crypto.randomUUID();
  c.set('requestId', requestId);
  c.header('x-request-id', requestId);

  const start = Date.now();
  await next();
  requestLogger(c).info({
    event: 'request',
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    durationMs: Date.now() - start,
  });
});

app.onError((err, c) => asErrorResponse(c, err));
app.notFound((c) => errors.notFound(c));

app.get('/healthz', (c) =>
  c.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  })
);

app.get('/readyz', async (c) => {
  const checks: Record<string, unknown> = {};
  let allHealthy = true;

  // D1 check
  const d1Check = await healthCheck(c.env);
  checks.d1 = d1Check;
  if (d1Check.status !== 'healthy') {
    allHealthy = false;
  }

  const response: Record<string, unknown> = {
    status: allHealthy ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
    service: 'beepd-api',
    environment: c.var.env.APP_ENV,
    checks,
  };

  return allHealthy ? c.json(response) : c.json(response, 503 as const);
});

app.route('/v1', v1Routes);

export default app;
