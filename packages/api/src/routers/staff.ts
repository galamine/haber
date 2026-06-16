import prisma from "@haber-final/db";
import { env } from "@haber-final/env/server";
import { TRPCError } from "@trpc/server";
import { Resend } from "resend";
import { z } from "zod";

import {
	clinicAdminProcedure,
	hasPermission,
	protectedProcedure,
	router,
} from "../index";
import { generateOtp, hashValue } from "../lib/otp";
import {
	AssignDepartmentsInput,
	InviteStaffInput,
	PERMISSIONS,
	StaffListInput,
	UpdateCredentialsInput,
	UpdatePermissionsInput,
} from "../schemas/staff";

const resend = new Resend(env.RESEND_API_KEY);

const INVITE_OTP_EXPIRY_MS = 48 * 60 * 60 * 1000;

async function getStaffOrThrow(userId: string, clinicId: string) {
	const user = await prisma.user.findFirst({
		where: { id: userId, clinicId },
		include: { permissions: true },
	});
	if (!user) throw new TRPCError({ code: "NOT_FOUND" });
	return user;
}

export const staffRouter = router({
	invite: clinicAdminProcedure
		.input(InviteStaffInput)
		.mutation(async ({ input, ctx }) => {
			const existing = await prisma.user.findUnique({
				where: { email: input.email },
			});
			if (existing) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "Email already registered",
				});
			}

			const code = generateOtp();
			const codeHash = hashValue(code);

			await prisma.$transaction(async (tx) => {
				const user = await tx.user.create({
					data: {
						email: input.email,
						role: input.role,
						clinicId: ctx.auth.tenantId!,
						loginEnabled: true,
					},
				});

				if (input.permissions.length > 0) {
					await tx.userPermission.createMany({
						data: input.permissions.map((permission) => ({
							userId: user.id,
							permission,
						})),
					});
				}

				if (input.departmentIds.length > 0) {
					await tx.userDepartmentAssignment.createMany({
						data: input.departmentIds.map((departmentId) => ({
							userId: user.id,
							departmentId,
						})),
					});
				}

				await tx.otp.create({
					data: {
						userId: user.id,
						type: "INVITE",
						codeHash,
						expiresAt: new Date(Date.now() + INVITE_OTP_EXPIRY_MS),
					},
				});
			});

			const inviteUrl = `${env.CORS_ORIGIN}/accept-invite?email=${encodeURIComponent(input.email)}&code=${code}`;

			await resend.emails.send({
				from: env.RESEND_FROM_EMAIL,
				to: input.email,
				subject: "You've been invited to join the clinic",
				text: `You've been invited to join the clinic.\n\nClick the link below to accept your invitation and log in. It expires in 48 hours.\n\n${inviteUrl}`,
			});

			return { message: "OTP sent" };
		}),

	list: clinicAdminProcedure
		.input(StaffListInput)
		.query(async ({ input, ctx }) => {
			const where = {
				clinicId: ctx.auth.tenantId!,
				...(input.role
					? { role: input.role }
					: {
							role: {
								in: ["THERAPIST", "STAFF"] as Array<"THERAPIST" | "STAFF">,
							},
						}),
				...(input.departmentId
					? {
							departmentAssignments: {
								some: { departmentId: input.departmentId },
							},
						}
					: {}),
			};

			const [items, total] = await prisma.$transaction([
				prisma.user.findMany({
					where,
					include: { permissions: true },
					skip: (input.page - 1) * input.pageSize,
					take: input.pageSize,
					orderBy: { createdAt: "desc" },
				}),
				prisma.user.count({ where }),
			]);

			return {
				items,
				total,
				page: input.page,
				totalPages: Math.ceil(total / input.pageSize),
			};
		}),

	listTherapists: protectedProcedure.query(async ({ ctx }) => {
		const hasIntake = await hasPermission(ctx, PERMISSIONS.CHILD_INTAKE);
		const isAdmin = ["CLINIC_ADMIN", "SUPER_ADMIN"].includes(ctx.auth.role);

		if (!hasIntake && !isAdmin) throw new TRPCError({ code: "FORBIDDEN" });

		return prisma.user.findMany({
			where: {
				clinicId: ctx.auth.tenantId!,
				role: "THERAPIST",
				loginEnabled: true,
			},
			select: { id: true, email: true, credentialsQualifications: true },
			orderBy: { email: "asc" },
		});
	}),

	get: clinicAdminProcedure
		.input(z.object({ userId: z.string() }))
		.query(async ({ input, ctx }) => {
			return getStaffOrThrow(input.userId, ctx.auth.tenantId!);
		}),

	updatePermissions: clinicAdminProcedure
		.input(UpdatePermissionsInput)
		.mutation(async ({ input, ctx }) => {
			await getStaffOrThrow(input.userId, ctx.auth.tenantId!);

			await prisma.$transaction([
				prisma.userPermission.deleteMany({ where: { userId: input.userId } }),
				prisma.userPermission.createMany({
					data: input.permissions.map((permission) => ({
						userId: input.userId,
						permission,
					})),
				}),
			]);

			return getStaffOrThrow(input.userId, ctx.auth.tenantId!);
		}),

	assignDepartments: clinicAdminProcedure
		.input(AssignDepartmentsInput)
		.mutation(async ({ input, ctx }) => {
			await getStaffOrThrow(input.userId, ctx.auth.tenantId!);

			if (input.departmentIds.length > 0) {
				const valid = await prisma.department.findMany({
					where: {
						id: { in: input.departmentIds },
						clinicId: ctx.auth.tenantId!,
					},
					select: { id: true },
				});
				if (valid.length !== input.departmentIds.length) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "One or more invalid department IDs",
					});
				}
			}

			await prisma.$transaction([
				prisma.userDepartmentAssignment.deleteMany({
					where: { userId: input.userId },
				}),
				prisma.userDepartmentAssignment.createMany({
					data: input.departmentIds.map((departmentId) => ({
						userId: input.userId,
						departmentId,
					})),
				}),
			]);
		}),

	deactivate: clinicAdminProcedure
		.input(z.object({ userId: z.string() }))
		.mutation(async ({ input, ctx }) => {
			await getStaffOrThrow(input.userId, ctx.auth.tenantId!);
			await prisma.user.update({
				where: { id: input.userId },
				data: { loginEnabled: false },
			});
		}),

	reactivate: clinicAdminProcedure
		.input(z.object({ userId: z.string() }))
		.mutation(async ({ input, ctx }) => {
			await getStaffOrThrow(input.userId, ctx.auth.tenantId!);
			await prisma.user.update({
				where: { id: input.userId },
				data: { loginEnabled: true },
			});
		}),

	updateCredentials: protectedProcedure
		.input(UpdateCredentialsInput)
		.mutation(async ({ input, ctx }) => {
			const isSelf = ctx.auth.userId === input.userId;
			const isClinicAdmin =
				ctx.auth.role === "CLINIC_ADMIN" && ctx.auth.tenantId !== null;

			if (!isSelf && !isClinicAdmin) {
				throw new TRPCError({ code: "FORBIDDEN" });
			}

			if (isClinicAdmin && !isSelf) {
				const target = await prisma.user.findFirst({
					where: { id: input.userId, clinicId: ctx.auth.tenantId! },
				});
				if (!target) throw new TRPCError({ code: "NOT_FOUND" });
			}

			const { userId, ...data } = input;
			return prisma.user.update({ where: { id: userId }, data });
		}),
});
