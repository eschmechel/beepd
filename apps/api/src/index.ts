import { Hono } from "hono";

import { parseEnv, type Env } from "@/env";

const app = new Hono<{
	Bindings: Record<string, unknown>;
	Variables: {
		env: Env;
	};
}>();

app.use("*", async (c, next) => {
	c.set("env", parseEnv(c.env));
	await next();
});

app.get("/healthz", (c) => c.json({ ok: true, service: "beepd-api" }));

export default app;
