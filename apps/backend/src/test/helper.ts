import { Hono } from 'hono';
import type { Env, Variables } from '../types/env';

export interface TestBindings extends Env {
  DB: D1Database;
  JWT_SECRET: string;
  ENVIRONMENT: 'development' | 'production' | 'preview';
}

export interface TestVariables extends Variables {
  userId: number;
}

export function createTestApp<R extends Hono<{ Bindings: Env; Variables: Variables }>>(routes: R): Hono<{ Bindings: TestBindings; Variables: TestVariables }> {
  return new Hono<{ Bindings: TestBindings; Variables: TestVariables }>().route('/', routes);
}

export function createMockContext(bindings: Partial<TestBindings> = {}): {
  env: TestBindings;
  req: { json: () => Promise<unknown>; query: () => Record<string, string>; param: (name: string) => string; header: (name: string) => string | undefined };
  json: (body: unknown, status?: number) => { json: unknown; status: number };
  get: (key: keyof TestVariables) => TestVariables[keyof TestVariables];
  set: (key: keyof TestVariables, value: unknown) => void;
} {
  const vars: TestVariables = { userId: 1 };

  return {
    env: {
      DB: {} as D1Database,
      JWT_SECRET: 'test-secret',
      ENVIRONMENT: 'development',
      ...bindings,
    } as TestBindings,
    req: {
      json: async () => ({}),
      query: () => ({}),
      param: () => '',
      header: () => undefined,
    },
    json: (body, status = 200) => ({ json: body, status }),
    get: (key) => vars[key],
    set: (key, value) => { vars[key] = value as TestVariables[keyof TestVariables]; },
  };
}

export async function runTest<R>(
  app: Hono<{ Bindings: TestBindings; Variables: TestVariables }>,
  method: 'GET' | 'PUT' | 'POST' | 'DELETE',
  path: string,
  options: {
    userId?: number;
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): Promise<{ status: number; body: unknown }> {
  const ctx = createMockContext();
  if (options.userId) ctx.set('userId', options.userId);

  const mockReq = {
    json: async () => options.body ?? {},
    query: () => ({}),
    param: (name: string) => path.split('/').pop() || '',
    header: (name: string) => options.headers?.[name],
  };

  const handler = app.fetch;
  const res = await handler(
    new Request(`http://localhost${path}`, {
      method,
      headers: options.headers ? new Headers(options.headers) : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
    }),
    ctx.env,
    // cast to any to satisfy TS (ExecutionContext doesn't include our req mock)
    { ...ctx, req: mockReq } as any
  );

  const body = await res.json();
  return { status: res.status, body };
}
