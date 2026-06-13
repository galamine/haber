import { createContext } from "@haber-final/api/context";
import { logger } from "@haber-final/api/lib/logger";
import { appRouter } from "@haber-final/api/routers/index";
import { env } from "@haber-final/env/server";
import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();

app.use(async (c, next) => {
	const start = Date.now();
	await next();
	logger.info(
		{
			method: c.req.method,
			path: c.req.path,
			status: c.res.status,
			ms: Date.now() - start,
		},
		"http",
	);
});
app.use(
	"/*",
	cors({
		origin: env.CORS_ORIGIN,
		allowMethods: ["GET", "POST", "OPTIONS"],
	}),
);

app.use(
	"/trpc/*",
	trpcServer({
		router: appRouter,
		createContext: (_opts, context) => {
			return createContext({ context });
		},
	}),
);

app.get("/", (c) => {
	return c.text("OK");
});

import { serve } from "@hono/node-server";

serve(
	{
		fetch: app.fetch,
		port: 3000,
	},
	(info) => {
		console.log(`Server is running on http://localhost:${info.port}`);
	},
);
