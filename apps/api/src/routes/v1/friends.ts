import { Hono } from 'hono';

import { readJsonBody } from '@/lib/validation';
import type { AppContext } from '@/routes/v1/_types';
import * as schemas from '@/routes/v1/schemas';

export const friendsRoutes = new Hono();

export async function postFriendsRequest(c: AppContext) {
  // TODO (docs/SPEC.md + TODO.md Phase 6):
  // 1) Authenticate user
  // 2) Validate targetUserId (uuid, not equal to current user)
  const { targetUserId } = await readJsonBody(
    c,
    schemas.friendsTargetRequestSchema
  );
  // 3) Anti-enumeration:
  //    - if target blocked you, respond generically (e.g. 404 "User not found")
  //    - if target does not exist, respond generically (e.g. 404 "User not found")
  // 4) Canonicalize pair (relationships table):
  //    - user_a_id = lexicographically smaller UUID
  //    - user_b_id = larger UUID
  // 5) Upsert row:
  //    - if row missing: create status='pending', initiated_by=current user
  //    - if row is pending and initiated_by != current user: accept immediately OR return conflict (pick one)
  //    - if row is accepted: return ok (idempotent)
  //    - if row is blocked: return generic not found
  // 6) Return generic success
  return c.json({ error: 'Not implemented' }, 501);
}

export async function postFriendsAccept(c: AppContext) {
  // TODO:
  // 1) Authenticate user
  // 2) Validate targetUserId
  const { targetUserId } = await readJsonBody(
    c,
    schemas.friendsTargetRequestSchema
  );
  // 3) Load relationship row for pair
  // 4) Only allow accept when status='pending' and initiated_by != current user
  // 5) Update status -> 'accepted'
  // 6) Return ok: true (idempotent if already accepted)
  return c.json({ error: 'Not implemented' }, 501);
}

export async function postFriendsDeny(c: AppContext) {
  // TODO:
  // 1) Authenticate user
  // 2) Validate targetUserId
  const { targetUserId } = await readJsonBody(
    c,
    schemas.friendsTargetRequestSchema
  );
  // 3) Only allow deny when status='pending' and initiated_by != current user
  // 4) Delete row (preferred for v0.1)
  // 5) Return ok: true
  return c.json({ error: 'Not implemented' }, 501);
}

export async function postFriendsRemove(c: AppContext) {
  // TODO:
  // 1) Authenticate user
  // 2) Validate targetUserId
  const { targetUserId } = await readJsonBody(
    c,
    schemas.friendsTargetRequestSchema
  );
  // 3) Remove existing friendship:
  //    - delete row (preferred for v0.1)
  // 4) Return ok: true
  return c.json({ error: 'Not implemented' }, 501);
}

export async function postFriendsBlock(c: AppContext) {
  // TODO:
  // 1) Authenticate user
  // 2) Validate targetUserId
  const { targetUserId } = await readJsonBody(
    c,
    schemas.friendsTargetRequestSchema
  );
  // 3) Canonicalize pair
  // 4) Upsert row:
  //    - status = blocked_by_a|blocked_by_b depending on whether current user is user_a_id
  //    - initiated_by = current user (keep it simple)
  // 5) Blocked users cannot see your location or request friendship (docs/SPEC.md)
  // 6) Return ok: true
  return c.json({ error: 'Not implemented' }, 501);
}

export async function postFriendsUnblock(c: AppContext) {
  // TODO:
  // 1) Authenticate user
  // 2) Validate targetUserId
  const { targetUserId } = await readJsonBody(
    c,
    schemas.friendsTargetRequestSchema
  );
  // 3) Canonicalize pair
  // 4) Only unblock if the current user set the block
  // 5) Delete row (preferred for v0.1)
  // 6) Return ok: true
  return c.json({ error: 'Not implemented' }, 501);
}

export async function getFriendsList(c: AppContext) {
  // TODO:
  // 1) Authenticate user
  // 2) Query relationships where status='accepted' and current user in (user_a_id, user_b_id)
  // 3) Return list of friend userIds (the other side of the pair)
  // 4) Optional: join users for displayName/avatarUrl
  return c.json({ error: 'Not implemented' }, 501);
}

export async function getFriendsRequests(c: AppContext) {
  // TODO:
  // 1) Authenticate user
  // 2) Query relationships where status='pending' and current user in (user_a_id, user_b_id)
  // 3) Split into incoming/outgoing by initiated_by
  // 4) Optional: join users for displayName/avatarUrl
  return c.json({ error: 'Not implemented' }, 501);
}

friendsRoutes.post('/request', postFriendsRequest);
friendsRoutes.post('/accept', postFriendsAccept);
friendsRoutes.post('/deny', postFriendsDeny);
friendsRoutes.post('/remove', postFriendsRemove);
friendsRoutes.post('/block', postFriendsBlock);
friendsRoutes.post('/unblock', postFriendsUnblock);
friendsRoutes.get('/', getFriendsList);
friendsRoutes.get('/requests', getFriendsRequests);
