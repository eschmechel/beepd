import { Hono } from 'hono';

import type { AppContext } from '@/routes/v1/_types';

export const policiesRoutes = new Hono();

export function getPolicies(c: AppContext) {
  // TODO: authenticate, list policies for current user
  return c.json({ error: 'Not implemented' }, 501);
}

export function putPoliciesGlobal(c: AppContext) {
  // TODO:
  // 1) authenticate
  // 2) validate body (vpr/per/location_enabled/notifications_enabled)
  // 3) upsert global policy row
  return c.json({ error: 'Not implemented' }, 501);
}

export function putPoliciesFriend(c: AppContext) {
  // TODO: authenticate, validate friendId param + body, upsert friend policy
  return c.json({ error: 'Not implemented' }, 501);
}

export function putPoliciesGroup(c: AppContext) {
  // v0.1: groups are deferred, but keep route stub for API shape stability.
  // TODO: authenticate, validate groupId + body, upsert group policy
  return c.json({ error: 'Not implemented' }, 501);
}

export function getPoliciesEffective(c: AppContext) {
  // TODO:
  // 1) authenticate
  // 2) validate viewerId param
  // 3) compute effective policy (friend overrides > group permissive > global)
  return c.json({ error: 'Not implemented' }, 501);
}

policiesRoutes.get('/', getPolicies);
policiesRoutes.put('/global', putPoliciesGlobal);
policiesRoutes.put('/friend/:id', putPoliciesFriend);
policiesRoutes.put('/group/:id', putPoliciesGroup);
policiesRoutes.get('/effective/:viewerId', getPoliciesEffective);
