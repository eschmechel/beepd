import { Hono } from "hono";

import type { AppContext } from "@/routes/v1/_types";

export const friendsRoutes = new Hono();

export async function postFriendsRequest(c: AppContext) {
	// TODO:
	// 1) Authenticate user
	// 2) Parse input (target user id or identifier, depending on product decision)
	// 3) Enforce anti-enumeration (generic response)
	// 4) Upsert relationships row for pair in pending state
	return c.json({ error: "Not implemented" }, 501);
}

export async function postFriendsAccept(c: AppContext) {
	// TODO:
	// 1) Authenticate user
	// 2) Validate request id / target id
	// 3) Update relationships status to accepted
	return c.json({ error: "Not implemented" }, 501);
}

export async function postFriendsDeny(c: AppContext) {
	// TODO: authenticate, validate, set status/cleanup pending request
	return c.json({ error: "Not implemented" }, 501);
}

export async function postFriendsRemove(c: AppContext) {
	// TODO: authenticate, validate, delete or set status to removed (decision)
	return c.json({ error: "Not implemented" }, 501);
}

export async function postFriendsBlock(c: AppContext) {
	// TODO: authenticate, validate, set relationship status to blocked_by_a/b
	return c.json({ error: "Not implemented" }, 501);
}

export async function postFriendsUnblock(c: AppContext) {
	// TODO: authenticate, validate, transition blocked state appropriately
	return c.json({ error: "Not implemented" }, 501);
}

export async function getFriendsList(c: AppContext) {
	// TODO: authenticate, list accepted relationships
	return c.json({ error: "Not implemented" }, 501);
}

export async function getFriendsRequests(c: AppContext) {
	// TODO: authenticate, list pending requests (incoming/outgoing)
	return c.json({ error: "Not implemented" }, 501);
}

friendsRoutes.post("/request", postFriendsRequest);
friendsRoutes.post("/accept", postFriendsAccept);
friendsRoutes.post("/deny", postFriendsDeny);
friendsRoutes.post("/remove", postFriendsRemove);
friendsRoutes.post("/block", postFriendsBlock);
friendsRoutes.post("/unblock", postFriendsUnblock);
friendsRoutes.get("/", getFriendsList);
friendsRoutes.get("/requests", getFriendsRequests);
