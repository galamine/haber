import prisma from "@haber-final/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { AuthUser } from "../context";
import { hasPermission, protectedProcedure, router } from "../index";
import {
	AssignTherapistInput,
	ChildListInput,
	CreateChildInput,
	ListAssignedChildrenInput,
	MedicalHistoryInput,
	UnassignTherapistInput,
	UpdateChildInput,
} from "../schemas/child";
import { PERMISSIONS } from "../schemas/staff";

async function requireIntakePermission(ctx: { auth: AuthUser }) {
	const allowed = await hasPermission(ctx, PERMISSIONS.CHILD_INTAKE);
	if (!allowed) throw new TRPCError({ code: "FORBIDDEN" });
}

export async function getChildForRead(
	childId: string,
	ctx: { auth: AuthUser },
) {
	const { role, tenantId, userId } = ctx.auth;

	const child = await prisma.child.findFirst({
		where: {
			id: childId,
			deletedAt: null,
			...(role !== "SUPER_ADMIN" ? { clinicId: tenantId ?? undefined } : {}),
		},
		include: { guards: true },
	});

	if (!child) throw new TRPCError({ code: "NOT_FOUND" });

	if (role === "THERAPIST" || role === "STAFF") {
		const isAssigned =
			child.preferredTherapistId === userId ||
			(await prisma.childTherapistAssignment.findFirst({
				where: { childId, therapistId: userId },
			})) !== null;
		if (!isAssigned) throw new TRPCError({ code: "FORBIDDEN" });
	}

	return child;
}

export async function assertChildInClinic(childId: string, tenantId: string) {
	const child = await prisma.child.findFirst({
		where: { id: childId, clinicId: tenantId, deletedAt: null },
	});
	if (!child) throw new TRPCError({ code: "NOT_FOUND" });
	return child;
}

export const childRouter = router({
	create: protectedProcedure
		.input(CreateChildInput)
		.mutation(async ({ input, ctx }) => {
			await requireIntakePermission(ctx);

			if (input.preferredTherapistId) {
				const therapist = await prisma.user.findFirst({
					where: {
						id: input.preferredTherapistId,
						role: "THERAPIST",
						clinicId: ctx.auth.tenantId!,
					},
				});
				if (!therapist) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message:
							"Invalid preferredTherapistId: not a THERAPIST in this clinic",
					});
				}
			}

			const emails = input.guardians.map((g) => g.email);
			const existingUsers = await prisma.user.findMany({
				where: { email: { in: emails } },
				select: { email: true },
			});
			if (existingUsers.length > 0) {
				throw new TRPCError({
					code: "CONFLICT",
					message: `Email already registered: ${existingUsers.map((u) => u.email).join(", ")}`,
				});
			}

			const { guardians, ...childData } = input;

			return prisma.$transaction(async (tx) => {
				const child = await tx.child.create({
					data: {
						...childData,
						clinicId: ctx.auth.tenantId!,
						medicalHistory: {},
					},
				});

				for (const guardian of guardians) {
					const guardianUser = await tx.user.create({
						data: {
							email: guardian.email,
							role: "GUARDIAN",
							loginEnabled: false,
							clinicId: ctx.auth.tenantId!,
						},
					});
					await tx.guardian.create({
						data: {
							childId: child.id,
							userId: guardianUser.id,
							name: guardian.name,
							relation: guardian.relation,
							phone: guardian.phone,
							email: guardian.email,
						},
					});
				}

				return child;
			});
		}),

	get: protectedProcedure
		.input(z.object({ childId: z.string() }))
		.query(async ({ input, ctx }) => {
			return getChildForRead(input.childId, ctx);
		}),

	list: protectedProcedure
		.input(ChildListInput)
		.query(async ({ input, ctx }) => {
			const { role, tenantId, userId } = ctx.auth;
			const isAdmin = role === "CLINIC_ADMIN" || role === "SUPER_ADMIN";

			const extraAnd: { OR: Record<string, unknown>[] }[] = [];

			if (role === "THERAPIST" || role === "STAFF") {
				const assignments = await prisma.childTherapistAssignment.findMany({
					where: { therapistId: userId },
					select: { childId: true },
				});
				const assignedChildIds = assignments.map((a) => a.childId);
				extraAnd.push({
					OR: [
						{ preferredTherapistId: userId },
						{ id: { in: assignedChildIds } },
					],
				});
			}

			if (input.search) {
				extraAnd.push({
					OR: [
						{ fullName: { contains: input.search, mode: "insensitive" } },
						{ opNumber: { contains: input.search, mode: "insensitive" } },
					],
				});
			}

			const where = {
				...(role !== "SUPER_ADMIN" ? { clinicId: tenantId ?? undefined } : {}),
				...(!isAdmin ? { deletedAt: null } : {}),
				...(input.therapistId
					? { preferredTherapistId: input.therapistId }
					: {}),
				...(input.consentStatus ? { consentStatus: input.consentStatus } : {}),
				...(extraAnd.length > 0 ? { AND: extraAnd } : {}),
			};

			const [items, total] = await prisma.$transaction([
				prisma.child.findMany({
					where,
					skip: (input.page - 1) * input.pageSize,
					take: input.pageSize,
					orderBy: { createdAt: "desc" },
				}),
				prisma.child.count({ where }),
			]);

			return {
				items,
				total,
				page: input.page,
				totalPages: Math.ceil(total / input.pageSize),
			};
		}),

	update: protectedProcedure
		.input(UpdateChildInput)
		.mutation(async ({ input, ctx }) => {
			await requireIntakePermission(ctx);
			await assertChildInClinic(input.id, ctx.auth.tenantId!);
			const { id, ...data } = input;
			return prisma.child.update({ where: { id }, data });
		}),

	updateMedicalHistory: protectedProcedure
		.input(z.object({ childId: z.string(), history: MedicalHistoryInput }))
		.mutation(async ({ input, ctx }) => {
			await requireIntakePermission(ctx);
			await assertChildInClinic(input.childId, ctx.auth.tenantId!);
			return prisma.child.update({
				where: { id: input.childId },
				data: { medicalHistory: input.history },
			});
		}),

	softDelete: protectedProcedure
		.input(z.object({ childId: z.string() }))
		.mutation(async ({ input, ctx }) => {
			const { role, tenantId } = ctx.auth;
			if (role !== "CLINIC_ADMIN" && role !== "SUPER_ADMIN") {
				throw new TRPCError({ code: "FORBIDDEN" });
			}

			const child = await prisma.child.findFirst({
				where: {
					id: input.childId,
					...(role !== "SUPER_ADMIN" ? { clinicId: tenantId! } : {}),
					deletedAt: null,
				},
			});
			if (!child) throw new TRPCError({ code: "NOT_FOUND" });

			await prisma.child.update({
				where: { id: input.childId },
				data: { deletedAt: new Date() },
			});
		}),

	checkIntakeComplete: protectedProcedure
		.input(z.object({ childId: z.string() }))
		.query(async ({ input, ctx }) => {
			await getChildForRead(input.childId, ctx);

			const child = await prisma.child.findFirst({
				where: { id: input.childId, deletedAt: null },
				include: { guards: { include: { consentRecords: true } } },
			});
			if (!child) throw new TRPCError({ code: "NOT_FOUND" });

			const missingFields: string[] = [];
			if (!child.opNumber) missingFields.push("opNumber");
			if (!child.fullName) missingFields.push("fullName");
			if (!child.dob) missingFields.push("dob");
			if (!child.sex) missingFields.push("sex");
			if (child.spokenLanguages.length === 0)
				missingFields.push("spokenLanguages");
			if (child.guards.length === 0) missingFields.push("guardians");
			if (
				child.consentStatus !== "GRANTED" ||
				child.guards.some((g) => g.consentRecords.length === 0)
			) {
				missingFields.push("consent");
			}

			return { complete: missingFields.length === 0, missingFields };
		}),

	assignTherapist: protectedProcedure
		.input(AssignTherapistInput)
		.mutation(async ({ input, ctx }) => {
			const { role, tenantId, userId } = ctx.auth;
			const isClinicAdmin = role === "CLINIC_ADMIN";
			const hasIntake = await hasPermission(ctx, PERMISSIONS.CHILD_INTAKE);
			if (!isClinicAdmin && !hasIntake) {
				throw new TRPCError({ code: "FORBIDDEN" });
			}

			await assertChildInClinic(input.childId, tenantId!);

			const therapist = await prisma.user.findFirst({
				where: {
					id: input.therapistId,
					role: "THERAPIST",
					clinicId: tenantId!,
				},
			});
			if (!therapist) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Invalid therapistId: not a THERAPIST in this clinic",
				});
			}

			const existing = await prisma.childTherapistAssignment.findFirst({
				where: { childId: input.childId, therapistId: input.therapistId },
			});
			if (existing) return existing;

			return prisma.childTherapistAssignment.create({
				data: {
					childId: input.childId,
					therapistId: input.therapistId,
					reviewDueAt: input.reviewDueAt,
				},
			});
		}),

	unassignTherapist: protectedProcedure
		.input(UnassignTherapistInput)
		.mutation(async ({ input, ctx }) => {
			if (ctx.auth.role !== "CLINIC_ADMIN") {
				throw new TRPCError({ code: "FORBIDDEN" });
			}
			await assertChildInClinic(input.childId, ctx.auth.tenantId!);
			await prisma.childTherapistAssignment.deleteMany({
				where: { childId: input.childId, therapistId: input.therapistId },
			});
		}),

	listAssignedChildren: protectedProcedure
		.input(ListAssignedChildrenInput)
		.query(async ({ input, ctx }) => {
			const { userId, tenantId } = ctx.auth;

			const assignments = await prisma.childTherapistAssignment.findMany({
				where: { therapistId: userId },
				select: { childId: true },
			});
			const childIds = assignments.map((a) => a.childId);

			const where = {
				id: { in: childIds },
				...(tenantId ? { clinicId: tenantId } : {}),
				deletedAt: null,
			};

			const [items, total] = await prisma.$transaction([
				prisma.child.findMany({
					where,
					skip: (input.page - 1) * input.pageSize,
					take: input.pageSize,
					orderBy: { createdAt: "desc" },
				}),
				prisma.child.count({ where }),
			]);

			return {
				items,
				total,
				page: input.page,
				totalPages: Math.ceil(total / input.pageSize),
			};
		}),
});
