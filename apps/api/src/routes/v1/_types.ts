import type { Context } from "hono";

export type AppEnv = {
	Bindings: {
		DB: D1Database;
	} & Record<string, unknown>;
	Variables: {
		// Filled by env middleware in src/index.ts
		env: unknown;
	};
};

export type AppContext = Context<AppEnv>;
