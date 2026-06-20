import prisma from "@haber-final/db";
import { PERMISSIONS } from "@haber-final/db/permissions";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { AuthUser } from "../context";
import { hasPermission, protectedProcedure, router } from "../index";
import {
	RecordConsentInput,
	RestoreConsentInput,
	WithdrawConsentInput,
} from "../schemas/consent";
import { assertChildInClinic, getChildForRead } from "./child";

async function requireIntakePermission(ctx: { auth: AuthUser }) {
	const allowed = await hasPermission(ctx, PERMISSIONS.CHILD_INTAKE);
	if (!allowed) throw new TRPCError({ code: "FORBIDDEN" });
}

async function assertChildAdmin(childId: string, ctx: { auth: AuthUser }) {
	const { role, tenantId } = ctx.auth;
	if (role !== "CLINIC_ADMIN" && role !== "SUPER_ADMIN") {
		throw new TRPCError({ code: "FORBIDDEN" });
	}
	const child = await prisma.child.findFirst({
		where: {
			id: childId,
			...(role !== "SUPER_ADMIN" ? { clinicId: tenantId! } : {}),
			deletedAt: null,
		},
	});
	if (!child) throw new TRPCError({ code: "NOT_FOUND" });
	return child;
}

export async function assertConsentGranted(childId: string) {
	const child = await prisma.child.findUnique({
		where: { id: childId },
		select: { consentStatus: true },
	});
	if (!child || child.consentStatus !== "GRANTED") {
		throw new TRPCError({ code: "PRECONDITION_FAILED" });
	}
}

async function checkAllConsentsGranted(childId: string): Promise<boolean> {
	const records = await prisma.consentRecord.findMany({ where: { childId } });
	const requiredTypes = [
		"TREATMENT",
		"DATA_PROCESSING",
		"IMAGE_VIDEO_CAPTURE",
	] as const;
	return requiredTypes.every((type) =>
		records.some((r) => r.consentType === type && r.checkbox),
	);
}

export const consentRouter: ReturnType<typeof router> = router({
	record: protectedProcedure
		.input(RecordConsentInput)
		.mutation(async ({ input, ctx }) => {
			await requireIntakePermission(ctx);
			await assertChildInClinic(input.childId, ctx.auth.tenantId!);

			return prisma.$transaction(async (tx) => {
				const record = await tx.consentRecord.upsert({
					where: {
						childId_consentType: {
							childId: input.childId,
							consentType: input.consentType,
						},
					},
					create: {
						childId: input.childId,
						consentType: input.consentType,
						typedName: input.typedName,
						checkbox: input.checkbox,
						ip: ctx.ip ?? "unknown",
					},
					update: {
						typedName: input.typedName,
						checkbox: input.checkbox,
						ip: ctx.ip ?? "unknown",
					},
				});

				const allGranted = await checkAllConsentsGranted(input.childId);
				if (allGranted) {
					await tx.child.update({
						where: { id: input.childId },
						data: { consentStatus: "GRANTED" },
					});
				}

				return record;
			});
		}),

	getStatus: protectedProcedure
		.input(z.object({ childId: z.string() }))
		.query(async ({ input, ctx }) => {
			const child = await getChildForRead(input.childId, ctx);

			const records = await prisma.consentRecord.findMany({
				where: { childId: input.childId },
				orderBy: { timestamp: "desc" },
			});

			const TYPES = [
				"TREATMENT",
				"DATA_PROCESSING",
				"IMAGE_VIDEO_CAPTURE",
			] as const;

			const consents = Object.fromEntries(
				TYPES.map((type) => {
					const latest = records.find((r) => r.consentType === type);
					return [
						type,
						{
							consented: latest?.checkbox ?? false,
							typedName: latest?.typedName ?? null,
							timestamp: latest?.timestamp ?? null,
						},
					];
				}),
			) as Record<
				(typeof TYPES)[number],
				{ consented: boolean; typedName: string | null; timestamp: Date | null }
			>;

			return { status: child.consentStatus, consents };
		}),

	withdraw: protectedProcedure
		.input(WithdrawConsentInput)
		.mutation(async ({ input, ctx }) => {
			await assertChildAdmin(input.childId, ctx);

			await prisma.$transaction(async (tx) => {
				await tx.child.update({
					where: { id: input.childId },
					data: { consentStatus: "WITHDRAWN" },
				});
				await tx.therapySession.updateMany({
					where: {
						childId: input.childId,
						status: "PENDING",
						scheduledDate: { gte: new Date() },
					},
					data: { blockedByConsent: true },
				});
			});
		}),

	restore: protectedProcedure
		.input(RestoreConsentInput)
		.mutation(async ({ input, ctx }) => {
			await assertChildAdmin(input.childId, ctx);

			await prisma.$transaction(async (tx) => {
				const allGranted = await checkAllConsentsGranted(input.childId);
				if (allGranted) {
					await tx.child.update({
						where: { id: input.childId },
						data: { consentStatus: "GRANTED" },
					});
					await tx.therapySession.updateMany({
						where: {
							childId: input.childId,
							status: "PENDING",
							scheduledDate: { gte: new Date() },
						},
						data: { blockedByConsent: false },
					});
				} else {
					await tx.child.update({
						where: { id: input.childId },
						data: { consentStatus: "PENDING" },
					});
				}
			});
		}),
});
