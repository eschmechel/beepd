import { Hono } from 'hono';

import type { AppContext } from '@/routes/v1/_types';

export const locationRoutes = new Hono();

export function postLocationLease(c: AppContext) {
  // TODO:
  // 1) authenticate
  // 2) validate request body (desired ttl? default 24h)
  // 3) call UserStateDO to create/extend lease
  // 4) return lease state
  return c.json({
    leaseId: 'TODO',
    expiresAt: 'TODO',
  });
}

export function postLocationPublish(c: AppContext) {
  // TODO:
  // 1) authenticate
  // 2) validate body (lat/lng/accuracy/ts)
  // 3) verify an active lease exists
  // 4) persist last-known in UserStateDO (and maybe D1 later)
  return c.json({});
}

export function getLocationSelf(c: AppContext) {
  // TODO: authenticate, fetch own current lease + last-known state
  return c.json({
    leaseId: 'TODO',
    expiresAt: 'TODO',
    lastKnown: {
      lat: 0,
      lng: 0,
      accuracy: 0,
      timestamp: 'TODO',
    },
  });
}

locationRoutes.post('/lease', postLocationLease);
locationRoutes.post('/publish', postLocationPublish);
locationRoutes.get('/self', getLocationSelf);
