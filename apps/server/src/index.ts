import { createContext } from "@haber-final/api/context";
import { logger } from "@haber-final/api/lib/logger";
import { appRouter } from "@haber-final/api/routers/index";
import {
	WebhookCompleteBody,
	WebhookStartBody,
} from "@haber-final/api/schemas/session-execution";
import prisma from "@haber-final/db";
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

app.post("/api/sessions/:id/start", async (c) => {
	const sessionId = c.req.param("id");
	const body = await c.req.json();
	const parsed = WebhookStartBody.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Invalid body" }, 400);
	}

	const session = await prisma.therapySession.findUnique({
		where: { id: sessionId },
	});
	if (!session) {
		return c.json({ error: "Session not found" }, 404);
	}

	if (session.webhookSecret !== parsed.data.webhook_secret) {
		return c.json({ error: "Invalid webhook secret" }, 401);
	}

	if (session.status !== "PENDING") {
		return c.json({ error: "Session is not pending" }, 409);
	}

	const updated = await prisma.therapySession.update({
		where: { id: sessionId },
		data: { status: "IN_PROGRESS", startedAt: new Date() },
	});

	return c.json({ sessionId: updated.id, startedAt: updated.startedAt });
});

app.post("/api/sessions/:id/complete", async (c) => {
	const sessionId = c.req.param("id");
	const body = await c.req.json();
	const parsed = WebhookCompleteBody.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Invalid body" }, 400);
	}

	const session = await prisma.therapySession.findUnique({
		where: { id: sessionId },
	});
	if (!session) {
		return c.json({ error: "Session not found" }, 404);
	}

	if (session.webhookSecret !== parsed.data.webhook_secret) {
		return c.json({ error: "Invalid webhook secret" }, 401);
	}

	if (session.status === "COMPLETED" && session.webhookSecretUsed) {
		const existingResult = await prisma.gameResult.findUnique({
			where: { sessionId },
		});
		return c.json(existingResult);
	}

	const result = await prisma.gameResult.create({
		data: {
			sessionId,
			scored: parsed.data.scored,
			rubricVersion: parsed.data.scored.rubric_version,
			rawMetrics: parsed.data.raw_metrics,
			events: parsed.data.events,
		},
	});

	await prisma.therapySession.update({
		where: { id: sessionId },
		data: {
			status: "COMPLETED",
			completedAt: new Date(),
			webhookSecretUsed: true,
		},
	});

	return c.json(result);
});

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
