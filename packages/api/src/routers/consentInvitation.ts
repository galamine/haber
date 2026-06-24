import { randomUUID } from "node:crypto";
import prisma from "@haber-final/db";
import { PERMISSIONS } from "@haber-final/db/permissions";
import { env } from "@haber-final/env/server";
import { TRPCError } from "@trpc/server";
import { Resend } from "resend";
import { z } from "zod";
import type { AuthUser } from "../context";
import {
	hasPermission,
	protectedProcedure,
	publicProcedure,
	router,
} from "../index";
import { hashValue } from "../lib/otp";
import {
	SendConsentInput,
	SubmitConsentInput,
	ValidateTokenInput,
} from "../schemas/consentInvitation";

const resend = new Resend(env.RESEND_API_KEY);

const INVITE_EXPIRY_DAYS = 7;

async function requireIntakePermission(ctx: { auth: AuthUser }) {
	const allowed = await hasPermission(ctx, PERMISSIONS.CHILD_INTAKE);
	if (!allowed) throw new TRPCError({ code: "FORBIDDEN" });
}

export const consentInvitationRouter: ReturnType<typeof router> = router({
	send: protectedProcedure
		.input(SendConsentInput)
		.mutation(async ({ input, ctx }) => {
			await requireIntakePermission(ctx);

			const child = await prisma.child.findFirst({
				where: {
					id: input.childId,
					deletedAt: null,
					...(ctx.auth.role !== "SUPER_ADMIN"
						? { clinicId: ctx.auth.tenantId! }
						: {}),
				},
			});
			if (!child) throw new TRPCError({ code: "NOT_FOUND" });

			const guardian = await prisma.guardian.findUnique({
				where: { childId: input.childId },
			});
			if (!guardian?.email) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Guardian has no email on file",
				});
			}

			await prisma.consentInvitation.deleteMany({
				where: { childId: input.childId, usedAt: null },
			});

			const token = randomUUID();
			const tokenHash = hashValue(token);
			const expiresAt = new Date(
				Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
			);

			const invitation = await prisma.consentInvitation.create({
				data: {
					childId: input.childId,
					tokenHash,
					expiresAt,
					createdBy: ctx.auth.userId,
				},
			});

			const consentUrl = `${env.CORS_ORIGIN}/consent?token=${token}`;

			if (env.NODE_ENV === "production") {
				await resend.emails.send({
					from: env.RESEND_FROM_EMAIL,
					to: guardian.email,
					subject: `Please provide consent for ${child.fullName}`,
					text: `Dear ${guardian.name},\n\nYou've been asked to provide consent for ${child.fullName}'s therapeutic services.\n\nPlease review and sign the consent forms by clicking the link below. This link expires in 7 days and can only be used once.\n\n${consentUrl}\n\nIf you did not expect this email, please ignore it.`,
				});
			} else {
				console.log(`[DEV CONSENT LINK] ${guardian.email}: ${consentUrl}`);
			}

			return { id: invitation.id, expiresAt };
		}),

	validate: publicProcedure
		.input(ValidateTokenInput)
		.query(async ({ input }) => {
			const tokenHash = hashValue(input.token);
			const invitation = await prisma.consentInvitation.findUnique({
				where: { tokenHash },
				include: {
					child: { include: { guardian: true } },
				},
			});

			if (!invitation) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Invalid invitation",
				});
			}
			if (invitation.usedAt) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "This link has already been used",
				});
			}
			if (invitation.expiresAt < new Date()) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "This link has expired",
				});
			}

			return {
				childName: invitation.child.fullName,
				guardianName: invitation.child.guardian?.name ?? null,
				guardianEmail: invitation.child.guardian?.email ?? null,
				expiresAt: invitation.expiresAt,
				alreadyUsed: false,
			};
		}),

	submit: publicProcedure
		.input(SubmitConsentInput)
		.mutation(async ({ input, ctx }) => {
			const tokenHash = hashValue(input.token);
			const invitation = await prisma.consentInvitation.findUnique({
				where: { tokenHash },
				include: { child: { include: { guardian: true } } },
			});

			if (!invitation) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Invalid invitation",
				});
			}
			if (invitation.usedAt) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "This link has already been used",
				});
			}
			if (invitation.expiresAt < new Date()) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "This link has expired",
				});
			}

			const ip = ctx.ip ?? "unknown";

			const types = [
				"TREATMENT",
				"DATA_PROCESSING",
				"IMAGE_VIDEO_CAPTURE",
			] as const;

			await prisma.$transaction(async (tx) => {
				for (const consentType of types) {
					await tx.consentRecord.upsert({
						where: {
							childId_consentType: {
								childId: invitation.childId,
								consentType,
							},
						},
						create: {
							childId: invitation.childId,
							consentType,
							typedName: input.typedName,
							checkbox: true,
							ip,
						},
						update: {
							typedName: input.typedName,
							checkbox: true,
							ip,
						},
					});
				}

				await tx.consentInvitation.update({
					where: { id: invitation.id },
					data: { usedAt: new Date() },
				});

				await tx.child.update({
					where: { id: invitation.childId },
					data: { consentStatus: "GRANTED" },
				});
			});

			const guardianEmail = invitation.child.guardian?.email;
			const guardianName = invitation.child.guardian?.name;
			const childName = invitation.child.fullName;

			if (guardianEmail && env.NODE_ENV === "production") {
				await resend.emails.send({
					from: env.RESEND_FROM_EMAIL,
					to: guardianEmail,
					subject: `Consent confirmed for ${childName}`,
					text: `Dear ${guardianName},\n\nYour consent for ${childName} has been successfully recorded.\n\nYou signed on ${new Date().toLocaleDateString()}.\n\nIf you have any questions, please contact the clinic.\n\n— Haber Clinic`,
				});
			}

			return { success: true };
		}),

	list: protectedProcedure
		.input(z.object({ childId: z.string() }))
		.query(async ({ input, ctx }) => {
			await requireIntakePermission(ctx);

			const invitations = await prisma.consentInvitation.findMany({
				where: { childId: input.childId },
				orderBy: { createdAt: "desc" },
				include: {
					child: { include: { guardian: true } },
				},
			});

			return invitations.map((inv) => ({
				id: inv.id,
				childId: inv.childId,
				childName: inv.child.fullName,
				guardianName: inv.child.guardian?.name ?? null,
				guardianEmail: inv.child.guardian?.email ?? null,
				expiresAt: inv.expiresAt,
				alreadyUsed: inv.usedAt !== null,
				createdAt: inv.createdAt,
			}));
		}),
});
