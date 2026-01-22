import { Hono } from "hono";

const app = new Hono();

app.get("/healthz", (c) => c.json({ ok: true, service: "beepd-api" }));

export default app;
