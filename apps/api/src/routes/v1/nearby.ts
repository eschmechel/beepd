import { Hono } from 'hono';

import type { AppContext } from '@/routes/v1/_types';

export const nearbyRoutes = new Hono();

export function getNearby(c: AppContext) {
  // TODO:
  // 1) authenticate
  // 2) determine eligible users (friends-only in v0.1)
  // 3) query relevant UserStateDO instances for last-known locations
  // 4) apply effective policy to determine precision/coarsening
  // 5) return nearby list
  return c.json([]);
}

export function getNearbyOverlay(c: AppContext) {
  // TODO: authenticate, return coarse H3 overlay (deferred)
  return c.json({ cells: [] });
}

export function postNearbyCell(c: AppContext) {
  // TODO: authenticate, validate cell id, return users in cell (deferred)
  return c.json([]);
}

nearbyRoutes.get('/', getNearby);
nearbyRoutes.get('/overlay', getNearbyOverlay);
nearbyRoutes.post('/cell', postNearbyCell);
