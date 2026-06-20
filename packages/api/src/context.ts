import type { Context as HonoContext } from "hono";

import { verifyAccessToken } from "./lib/jwt";
import type { JwtPayload } from "./schemas/index";

export type CreateContextOptions = {
	context: HonoContext;
};

export type AuthUser = Omit<JwtPayload, "sub"> & { userId: string };

export async function createContext({ context }: CreateContextOptions) {
	let auth: AuthUser | null = null;

	const authHeader = context.req.header("Authorization");
	if (authHeader?.startsWith("Bearer ")) {
		const token = authHeader.slice(7);
		const payload = await verifyAccessToken(token);
		if (payload !== null) {
			auth = {
				userId: payload.sub,
				role: payload.role,
				tenantId: payload.tenantId,
				familyId: payload.familyId,
			};
		}
	}

	const ip =
		context.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
		context.req.header("x-real-ip") ??
		"unknown";

	return { auth, session: null, ip };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
