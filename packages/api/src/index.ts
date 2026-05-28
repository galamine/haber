import prisma from "@haber-final/db";
import { initTRPC, TRPCError } from "@trpc/server";

import type { AuthUser, Context } from "./context";
import { logger } from "./lib/logger";

export const t = initTRPC.context<Context>().create();

export const router = t.router;

const SENSITIVE_KEYS = new Set(["code", "password", "refreshToken", "token"]);

function sanitizeInput(input: unknown): unknown {
	if (!input || typeof input !== "object") return input;
	return Object.fromEntries(
		Object.entries(input as Record<string, unknown>).map(([k, v]) => [
			k,
			SENSITIVE_KEYS.has(k) ? "[redacted]" : v,
		]),
	);
}

const loggingMiddleware = t.middleware(async ({ path, type, input, next }) => {
	const start = Date.now();
	const result = await next();
	const ms = Date.now() - start;
	if (result.ok) {
		logger.info({ path, type, input: sanitizeInput(input), ms }, "trpc ok");
	} else {
		logger.error(
			{ path, type, input: sanitizeInput(input), ms, err: result.error },
			"trpc error",
		);
	}
	return result;
});

export const publicProcedure = t.procedure.use(loggingMiddleware);

const enforceAuth = t.middleware(async ({ ctx, next }) => {
	if (ctx.auth === null) {
		throw new TRPCError({ code: "UNAUTHORIZED" });
	}
	const auth: AuthUser = ctx.auth;

	await prisma.session.updateMany({
		where: { familyId: auth.familyId, revokedAt: null },
		data: { lastActivity: new Date() },
	});

	return next({ ctx: { ...ctx, auth } });
});

export const protectedProcedure = t.procedure.use(enforceAuth);

const enforceAdmin = enforceAuth.unstable_pipe(async ({ ctx, next }) => {
	if (ctx.auth.role !== "SUPER_ADMIN") {
		throw new TRPCError({ code: "FORBIDDEN" });
	}
	return next({ ctx });
});

export const adminProcedure = t.procedure.use(enforceAdmin);

const enforceClinicAdmin = enforceAuth.unstable_pipe(async ({ ctx, next }) => {
	if (ctx.auth.role !== "CLINIC_ADMIN" || ctx.auth.tenantId === null) {
		throw new TRPCError({ code: "FORBIDDEN" });
	}
	return next({ ctx });
});

export const clinicAdminProcedure = t.procedure.use(enforceClinicAdmin);
