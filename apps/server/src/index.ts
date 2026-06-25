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
	const ms = Date.now() - start;
	const logData = {
		method: c.req.method,
		path: c.req.path,
		status: c.res.status,
		ms,
	};

	if (c.res.status >= 400) {
		let errorBody: string | undefined;
		try {
			if (c.res.body) {
				errorBody = await c.res.text();
			}
		} catch {
			/* ignore - body already consumed */
		}

		logger.error({ ...logData, error: errorBody }, "http error");
	} else {
		logger.info(logData, "http");
	}
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

app.onError((err, c) => {
	logger.error(
		{
			method: c.req.method,
			path: c.req.path,
			error: err.message,
			stack: err.stack,
		},
		"request error",
	);
	return c.text("Internal Server Error", 500);
});

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
