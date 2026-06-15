import { randomUUID } from "node:crypto";
import prisma from "@haber-final/db";
import { env } from "@haber-final/env/server";
import { TRPCError } from "@trpc/server";
import { Resend } from "resend";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../index";
import { signAccessToken } from "../lib/jwt";
import { logger } from "../lib/logger";
import { generateOtp, hashValue } from "../lib/otp";
import { checkRateLimit } from "../lib/rate-limit";
import { RequestOtpInput, VerifyOtpInput } from "../schemas/index";

const resend = new Resend(env.RESEND_API_KEY);

const OTP_WINDOW_MS = 10 * 60 * 1000;
const OTP_MAX_REQUESTS = 3;
const OTP_EXPIRY_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const SESSION_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;
const IDLE_EXPIRY_MS = 24 * 60 * 60 * 1000;

function maskEmail(email: string): string {
	return email.replace(/(.{2}).*(@.*)/, "$1***$2");
}

export const authRouter = router({
	requestOtp: publicProcedure
		.input(RequestOtpInput)
		.mutation(async ({ input }) => {
			const allowed = checkRateLimit(
				input.email,
				OTP_MAX_REQUESTS,
				OTP_WINDOW_MS,
			);
			if (!allowed) {
				logger.warn({ email: maskEmail(input.email) }, "auth: rate limit hit");
				throw new TRPCError({
					code: "TOO_MANY_REQUESTS",
					message: "Too many OTP requests. Try again later.",
				});
			}

			const user = await prisma.user.findUnique({
				where: { email: input.email },
			});

			if (!user?.loginEnabled) {
				return { success: true };
			}

			logger.info({ email: maskEmail(input.email) }, "auth: OTP requested");

			const code = generateOtp();

			await prisma.$transaction(async (tx) => {
				await tx.otp.updateMany({
					where: {
						userId: user.id,
						type: "LOGIN",
						usedAt: null,
						invalidatedAt: null,
						expiresAt: { gt: new Date() },
					},
					data: { invalidatedAt: new Date() },
				});

				await tx.otp.create({
					data: {
						userId: user.id,
						codeHash: hashValue(code),
						expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
					},
				});
			});

			if (env.NODE_ENV === "production") {
				await resend.emails.send({
					from: env.RESEND_FROM_EMAIL,
					to: input.email,
					subject: "Your login code",
					text: `Your login code is: ${code}\n\nIt expires in 10 minutes.`,
				});
			} else {
				console.log(`[DEV OTP] ${input.email}: ${code}`);
			}

			return { success: true };
		}),

	verifyOtp: publicProcedure
		.input(VerifyOtpInput)
		.mutation(async ({ input }) => {
			const user = await prisma.user.findUnique({
				where: { email: input.email },
			});

			if (!user) {
				throw new TRPCError({ code: "UNAUTHORIZED" });
			}

			const otp = await prisma.otp.findFirst({
				where: {
					userId: user.id,
					usedAt: null,
					invalidatedAt: null,
					expiresAt: { gt: new Date() },
				},
				orderBy: { createdAt: "desc" },
			});

			if (!otp) {
				throw new TRPCError({ code: "UNAUTHORIZED" });
			}

			const updated = await prisma.otp.update({
				where: { id: otp.id },
				data: { attemptCount: { increment: 1 } },
			});

			if (updated.attemptCount > OTP_MAX_ATTEMPTS) {
				logger.warn({ userId: user.id }, "auth: OTP max attempts exceeded");
				await prisma.otp.update({
					where: { id: otp.id },
					data: { invalidatedAt: new Date() },
				});
				throw new TRPCError({ code: "UNAUTHORIZED" });
			}

			if (updated.codeHash !== hashValue(input.code)) {
				logger.warn(
					{ userId: user.id, attemptCount: updated.attemptCount },
					"auth: OTP invalid attempt",
				);
				if (updated.attemptCount >= OTP_MAX_ATTEMPTS) {
					await prisma.otp.update({
						where: { id: otp.id },
						data: { invalidatedAt: new Date() },
					});
				}
				throw new TRPCError({ code: "UNAUTHORIZED" });
			}

			const refreshToken = randomUUID();
			const familyId = randomUUID();
			const now = new Date();

			await prisma.$transaction(async (tx) => {
				await tx.otp.update({
					where: { id: otp.id },
					data: { usedAt: new Date() },
				});

				if (!user.emailVerified) {
					await tx.user.update({
						where: { id: user.id },
						data: { emailVerified: true },
					});
				}

				await tx.session.create({
					data: {
						userId: user.id,
						tokenHash: hashValue(refreshToken),
						familyId,
						expiresAt: new Date(now.getTime() + SESSION_EXPIRY_MS),
						lastActivity: now,
					},
				});
			});

			const accessToken = await signAccessToken({
				sub: user.id,
				role: user.role,
				tenantId: user.clinicId,
				familyId,
			});

			logger.info({ userId: user.id }, "auth: login success");

			return { accessToken, refreshToken };
		}),

	refreshToken: publicProcedure
		.input(z.object({ refreshToken: z.string() }))
		.mutation(async ({ input }) => {
			const tokenHash = hashValue(input.refreshToken);
			const session = await prisma.session.findUnique({
				where: { tokenHash },
				include: { user: true },
			});

			if (!session || session.revokedAt !== null) {
				if (session) {
					logger.warn(
						{ familyId: session.familyId },
						"auth: refresh token reuse detected",
					);
					await prisma.session.updateMany({
						where: { familyId: session.familyId },
						data: { reuseDetected: true, revokedAt: new Date() },
					});
				}
				throw new TRPCError({ code: "UNAUTHORIZED" });
			}

			const idleMs = Date.now() - session.lastActivity.getTime();
			if (idleMs > IDLE_EXPIRY_MS) {
				logger.info({ sessionId: session.id }, "auth: refresh idle expired");
				await prisma.session.update({
					where: { id: session.id },
					data: { revokedAt: new Date() },
				});
				throw new TRPCError({ code: "UNAUTHORIZED" });
			}

			logger.debug({ userId: session.userId }, "auth: refresh success");

			const newRefreshToken = randomUUID();
			const now = new Date();

			await prisma.$transaction(async (tx) => {
				await tx.session.update({
					where: { id: session.id },
					data: { revokedAt: new Date() },
				});

				await tx.session.create({
					data: {
						userId: session.userId,
						tokenHash: hashValue(newRefreshToken),
						familyId: session.familyId,
						expiresAt: new Date(now.getTime() + SESSION_EXPIRY_MS),
						lastActivity: now,
					},
				});
			});

			const accessToken = await signAccessToken({
				sub: session.user.id,
				role: session.user.role,
				tenantId: session.user.clinicId,
				familyId: session.familyId,
			});

			return { accessToken, refreshToken: newRefreshToken };
		}),

	logout: protectedProcedure
		.input(z.object({ refreshToken: z.string() }))
		.mutation(async ({ input, ctx }) => {
			const tokenHash = hashValue(input.refreshToken);
			await prisma.session.updateMany({
				where: { tokenHash, userId: ctx.auth.userId, revokedAt: null },
				data: { revokedAt: new Date() },
			});
			logger.info({ userId: ctx.auth.userId }, "auth: logout");
			return { success: true };
		}),

	logoutAll: protectedProcedure.mutation(async ({ ctx }) => {
		await prisma.session.updateMany({
			where: { userId: ctx.auth.userId, revokedAt: null },
			data: { revokedAt: new Date() },
		});
		logger.info({ userId: ctx.auth.userId }, "auth: logout all");
		return { success: true };
	}),

	me: protectedProcedure.query(async ({ ctx }) => {
		return prisma.user.findUniqueOrThrow({
			where: { id: ctx.auth.userId },
			select: {
				email: true,
				credentialsQualifications: true,
				credentialsRegistrationNumber: true,
			},
		});
	}),
});
