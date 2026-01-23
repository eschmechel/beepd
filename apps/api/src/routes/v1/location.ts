import { Hono } from "hono";

import type { AppContext } from "@/routes/v1/_types";

export const locationRoutes = new Hono();

export async function postLocationLease(c: AppContext) {
	// TODO:
	// 1) authenticate
	// 2) validate request body (desired ttl? default 24h)
	// 3) call UserStateDO to create/extend lease
	// 4) return lease state
	return c.json({ error: "Not implemented" }, 501);
}

export async function postLocationPublish(c: AppContext) {
	// TODO:
	// 1) authenticate
	// 2) validate body (lat/lng/accuracy/ts)
	// 3) verify an active lease exists
	// 4) persist last-known in UserStateDO (and maybe D1 later)
	return c.json({ error: "Not implemented" }, 501);
}

export async function getLocationSelf(c: AppContext) {
	// TODO: authenticate, fetch own current lease + last-known state
	return c.json({ error: "Not implemented" }, 501);
}

locationRoutes.post("/lease", postLocationLease);
locationRoutes.post("/publish", postLocationPublish);
locationRoutes.get("/self", getLocationSelf);
