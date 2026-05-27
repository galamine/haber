import { env } from "@habe-final/env/server";
import { jwtVerify, SignJWT } from "jose";

import type { JwtPayload } from "../schemas/index";

const secret = new TextEncoder().encode(env.JWT_SECRET);

export async function signAccessToken(payload: JwtPayload): Promise<string> {
	return new SignJWT({
		role: payload.role,
		tenantId: payload.tenantId,
		familyId: payload.familyId,
	})
		.setProtectedHeader({ alg: "HS256" })
		.setSubject(payload.sub)
		.setIssuedAt()
		.setExpirationTime("15m")
		.sign(secret);
}

export async function verifyAccessToken(
	token: string,
): Promise<JwtPayload | null> {
	try {
		const { payload } = await jwtVerify(token, secret);
		if (
			typeof payload.sub !== "string" ||
			typeof payload.role !== "string" ||
			typeof payload.familyId !== "string"
		) {
			return null;
		}
		return {
			sub: payload.sub,
			role: payload.role as JwtPayload["role"],
			tenantId:
				payload.tenantId === null || payload.tenantId === undefined
					? null
					: String(payload.tenantId),
			familyId: payload.familyId,
		};
	} catch {
		return null;
	}
}
