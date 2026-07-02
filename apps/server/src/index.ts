import { hasPermission } from "@haber-final/api";
import { createContext } from "@haber-final/api/context";
import { logger } from "@haber-final/api/lib/logger";
import { appRouter } from "@haber-final/api/routers/index";
import {
	WebhookCompleteBody,
	WebhookStartBody,
} from "@haber-final/api/schemas/session-execution";
import prisma from "@haber-final/db";
import { PERMISSIONS } from "@haber-final/db/permissions";
import { env } from "@haber-final/env/server";
import { trpcServer } from "@hono/trpc-server";
import { v2 as cloudinary } from "cloudinary";
import { Hono } from "hono";
import { cors } from "hono/cors";

cloudinary.config({
	cloudinary_url: env.CLOUDINARY_URL,
});

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

app.post("/api/upload/child-photo", async (c) => {
	const authContext = await createContext({ context: c });
	if (authContext.auth === null) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const hasIntake = await hasPermission(
		{ auth: authContext.auth },
		PERMISSIONS.CHILD_INTAKE,
	);
	if (!hasIntake) {
		return c.json({ error: "Forbidden" }, 403);
	}

	const childId = c.req.query("childId");
	if (!childId) {
		return c.json({ error: "childId is required" }, 400);
	}

	const child = await prisma.child.findUnique({
		where: { id: childId },
		select: { clinicId: true },
	});
	if (!child) {
		return c.json({ error: "Child not found" }, 404);
	}
	if (child.clinicId !== authContext.auth.tenantId) {
		return c.json({ error: "Child does not belong to your clinic" }, 403);
	}

	const body = await c.req.parseBody();
	const file = body.file;
	if (!file || !(file instanceof File)) {
		return c.json({ error: "No file provided" }, 400);
	}

	const MAX_SIZE = 5 * 1024 * 1024;
	if (file.size > MAX_SIZE) {
		return c.json({ error: "File size must be 5MB or less" }, 400);
	}

	if (!file.type.startsWith("image/")) {
		return c.json({ error: "Only image files are allowed" }, 400);
	}

	const timestamp = Date.now();
	const publicId = `child/${childId}/${timestamp}-${file.name}`;
	const buffer = Buffer.from(await file.arrayBuffer());
	const b64 = buffer.toString("base64");
	const dataUri = `data:${file.type};base64,${b64}`;

	const result = await cloudinary.uploader.upload(dataUri, {
		public_id: publicId,
		folder: "",
		resource_type: "image",
	});

	return c.json({ url: result.secure_url });
});

app.post("/api/upload/profile-photo", async (c) => {
	const authContext = await createContext({ context: c });
	if (authContext.auth === null) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const body = await c.req.parseBody();
	const file = body.file;
	if (!file || !(file instanceof File)) {
		return c.json({ error: "No file provided" }, 400);
	}

	const MAX_SIZE = 5 * 1024 * 1024;
	if (file.size > MAX_SIZE) {
		return c.json({ error: "File size must be 5MB or less" }, 400);
	}

	if (!file.type.startsWith("image/")) {
		return c.json({ error: "Only image files are allowed" }, 400);
	}

	const timestamp = Date.now();
	const userId = authContext.auth.userId;
	const publicId = `profile/${userId}/${timestamp}-${file.name}`;
	const buffer = Buffer.from(await file.arrayBuffer());
	const b64 = buffer.toString("base64");
	const dataUri = `data:${file.type};base64,${b64}`;

	const result = await cloudinary.uploader.upload(dataUri, {
		public_id: publicId,
		folder: "",
		resource_type: "image",
	});

	return c.json({ url: result.secure_url });
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
