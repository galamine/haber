import prisma from "@habe-final/db";
import { initTRPC, TRPCError } from "@trpc/server";

import type { AuthUser, Context } from "./context";

export const t = initTRPC.context<Context>().create();

export const router = t.router;

export const publicProcedure = t.procedure;

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
