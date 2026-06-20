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

async function assertGuardianOfChild(guardianId: string, childId: string) {
	const guardian = await prisma.guardian.findFirst({
		where: { id: guardianId, childId },
	});
	if (!guardian) throw new TRPCError({ code: "NOT_FOUND" });
	return guardian;
}

async function isUnanimousTreatmentConsent(childId: string): Promise<boolean> {
	const child = await prisma.child.findUnique({
		where: { id: childId },
		include: {
			guards: {
				include: {
					consentRecords: {
						where: { consentType: "TREATMENT", checkbox: true },
						select: { id: true },
					},
				},
			},
		},
	});
	if (!child) return false;
	return (
		child.guards.length > 0 &&
		child.guards.every((g) => g.consentRecords.length > 0)
	);
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

export const consentRouter: ReturnType<typeof router> = router({
	record: protectedProcedure
		.input(RecordConsentInput)
		.mutation(async ({ input, ctx }) => {
			await requireIntakePermission(ctx);
			await assertChildInClinic(input.childId, ctx.auth.tenantId!);
			await assertGuardianOfChild(input.guardianId, input.childId);

			return prisma.$transaction(async (tx) => {
				const record = await tx.consentRecord.create({
					data: {
						childId: input.childId,
						guardianId: input.guardianId,
						consentType: input.consentType,
						typedName: input.typedName,
						checkbox: input.checkbox,
						ip: ctx.ip,
					},
				});

				if (input.consentType === "TREATMENT") {
					const child = await tx.child.findUnique({
						where: { id: input.childId },
						select: { consentStatus: true },
					});
					if (
						child?.consentStatus === "PENDING" &&
						(await isUnanimousTreatmentConsent(input.childId))
					) {
						await tx.child.update({
							where: { id: input.childId },
							data: { consentStatus: "GRANTED" },
						});
					}
				}

				return record;
			});
		}),

	getStatus: protectedProcedure
		.input(z.object({ childId: z.string() }))
		.query(async ({ input, ctx }) => {
			const child = await getChildForRead(input.childId, ctx);

			const guardians = await prisma.guardian.findMany({
				where: { childId: input.childId },
				include: { consentRecords: { orderBy: { timestamp: "desc" } } },
			});

			const TYPES = [
				"TREATMENT",
				"DATA_PROCESSING",
				"IMAGE_VIDEO_CAPTURE",
			] as const;

			const guardianSummaries = guardians.map((g) => {
				const consents = {} as Record<
					(typeof TYPES)[number],
					{
						consented: boolean;
						typedName: string | null;
						timestamp: Date | null;
					}
				>;
				for (const type of TYPES) {
					const latest = g.consentRecords.find((r) => r.consentType === type);
					consents[type] = {
						consented: latest?.checkbox ?? false,
						typedName: latest?.typedName ?? null,
						timestamp: latest?.timestamp ?? null,
					};
				}
				return {
					guardianId: g.id,
					name: g.name,
					relation: g.relation,
					consents,
				};
			});

			return { status: child.consentStatus, guardians: guardianSummaries };
		}),

	withdraw: protectedProcedure
		.input(WithdrawConsentInput)
		.mutation(async ({ input, ctx }) => {
			await assertChildAdmin(input.childId, ctx);
			await assertGuardianOfChild(input.guardianId, input.childId);

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
			await assertGuardianOfChild(input.guardianId, input.childId);

			await prisma.$transaction(async (tx) => {
				const unanimous = await isUnanimousTreatmentConsent(input.childId);
				if (unanimous) {
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
