import type { Env } from '@/env';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levelRank: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function shouldLog(current: LogLevel, target: LogLevel) {
  return levelRank[target] >= levelRank[current];
}

function emit(level: LogLevel, payload: Record<string, unknown>) {
  const line = JSON.stringify({
    level,
    ts: new Date().toISOString(),
    ...payload,
  });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export function loggerForEnv(env: Pick<Env, 'LOG_LEVEL' | 'APP_ENV'>) {
  const current = env.LOG_LEVEL;
  return {
    debug(payload: Record<string, unknown>) {
      if (shouldLog(current, 'debug')) emit('debug', payload);
    },
    info(payload: Record<string, unknown>) {
      if (shouldLog(current, 'info')) emit('info', payload);
    },
    warn(payload: Record<string, unknown>) {
      if (shouldLog(current, 'warn')) emit('warn', payload);
    },
    error(payload: Record<string, unknown>) {
      if (shouldLog(current, 'error')) emit('error', payload);
    },
  };
}

export function requestLogger(c: {
  var: { env: Env; requestId?: string; userId?: string };
}) {
  const log = loggerForEnv(c.var.env);
  const base = {
    requestId: c.var.requestId,
    userId: c.var.userId,
  };

  return {
    debug(payload: Record<string, unknown>) {
      log.debug({ ...base, ...payload });
    },
    info(payload: Record<string, unknown>) {
      log.info({ ...base, ...payload });
    },
    warn(payload: Record<string, unknown>) {
      log.warn({ ...base, ...payload });
    },
    error(payload: Record<string, unknown>) {
      log.error({ ...base, ...payload });
    },
  };
}
