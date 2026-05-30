import prisma from "@haber-final/db";
import { env } from "@haber-final/env/server";
import { TRPCError } from "@trpc/server";
import { Resend } from "resend";
import { z } from "zod";

import { adminProcedure, clinicAdminProcedure, router } from "../index";
import { generateOtp, hashValue } from "../lib/otp";

const resend = new Resend(env.RESEND_API_KEY);

import {
	ClinicListInput,
	CreateClinicInput,
	CreateDepartmentInput,
	CreateSensoryRoomInput,
	UpdateClinicInput,
	UpdateDepartmentInput,
	UpdateSensoryRoomInput,
} from "../schemas/clinic";

export const clinicRouter = router({
	// ── SuperAdmin procedures ────────────────────────────────────────────────

	create: adminProcedure
		.input(CreateClinicInput)
		.mutation(async ({ input }) => {
			return prisma.clinic.create({ data: input });
		}),

	inviteAdmin: adminProcedure
		.input(z.object({ clinicId: z.string(), email: z.string().email() }))
		.mutation(async ({ input }) => {
			const clinic = await prisma.clinic.findFirst({
				where: { id: input.clinicId, deletedAt: null },
			});
			if (!clinic) throw new TRPCError({ code: "NOT_FOUND" });

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
						role: "CLINIC_ADMIN",
						clinicId: input.clinicId,
						loginEnabled: true,
					},
				});
				await tx.otp.create({
					data: {
						userId: user.id,
						type: "INVITE",
						codeHash,
						expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
					},
				});
			});

			const inviteUrl = `${env.CORS_ORIGIN}/accept-invite?email=${encodeURIComponent(input.email)}&code=${code}`;

			await resend.emails.send({
				from: env.RESEND_FROM_EMAIL,
				to: input.email,
				subject: "You've been invited as Clinic Admin",
				text: `You've been invited to manage ${clinic.name}.\n\nClick the link below to accept your invitation and log in. It expires in 48 hours.\n\n${inviteUrl}`,
			});

			return { message: "Invite sent" };
		}),

	list: adminProcedure.input(ClinicListInput).query(async ({ input }) => {
		const { page, pageSize } = input;
		const skip = (page - 1) * pageSize;
		const [items, total] = await prisma.$transaction([
			prisma.clinic.findMany({
				where: { deletedAt: null },
				skip,
				take: pageSize,
				orderBy: { createdAt: "desc" },
			}),
			prisma.clinic.count({ where: { deletedAt: null } }),
		]);
		return { items, total, page, totalPages: Math.ceil(total / pageSize) };
	}),

	get: adminProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ input }) => {
			const clinic = await prisma.clinic.findFirst({
				where: { id: input.id, deletedAt: null },
			});
			if (!clinic) throw new TRPCError({ code: "NOT_FOUND" });
			return clinic;
		}),

	update: adminProcedure
		.input(UpdateClinicInput)
		.mutation(async ({ input }) => {
			const { id, ...data } = input;
			return prisma.clinic.update({ where: { id }, data });
		}),

	platformSummary: adminProcedure.query(async () => {
		const clinics = await prisma.clinic.findMany({
			where: { deletedAt: null },
		});
		const now = new Date();
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

		return Promise.all(
			clinics.map(async (clinic) => {
				const [activeChildren, activeTherapists, sessionsThisMonth] =
					await Promise.all([
						prisma.child.count({
							where: { clinicId: clinic.id, deletedAt: null },
						}),
						prisma.user.count({
							where: { clinicId: clinic.id, role: "THERAPIST" },
						}),
						prisma.therapySession.count({
							where: {
								plan: { clinicId: clinic.id },
								scheduledDate: { gte: startOfMonth, lt: endOfMonth },
							},
						}),
					]);
				return {
					name: clinic.name,
					createdAt: clinic.createdAt,
					activeChildren,
					activeTherapists,
					sessionsThisMonth,
				};
			}),
		);
	}),

	// ── ClinicAdmin procedures ───────────────────────────────────────────────

	createDepartment: clinicAdminProcedure
		.input(CreateDepartmentInput)
		.mutation(async ({ input, ctx }) => {
			return prisma.department.create({
				data: { ...input, clinicId: ctx.auth.tenantId! },
			});
		}),

	listDepartments: clinicAdminProcedure.query(async ({ ctx }) => {
		return prisma.department.findMany({
			where: { clinicId: ctx.auth.tenantId! },
			orderBy: { createdAt: "asc" },
		});
	}),

	updateDepartment: clinicAdminProcedure
		.input(UpdateDepartmentInput)
		.mutation(async ({ input, ctx }) => {
			const { id, ...data } = input;
			return prisma.department.update({
				where: { id, clinicId: ctx.auth.tenantId! },
				data,
			});
		}),

	deleteDepartment: clinicAdminProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ input, ctx }) => {
			await prisma.department.delete({
				where: { id: input.id, clinicId: ctx.auth.tenantId! },
			});
		}),

	createSensoryRoom: clinicAdminProcedure
		.input(CreateSensoryRoomInput)
		.mutation(async ({ input, ctx }) => {
			return prisma.sensoryRoom.create({
				data: { ...input, clinicId: ctx.auth.tenantId! },
			});
		}),

	listSensoryRooms: clinicAdminProcedure.query(async ({ ctx }) => {
		return prisma.sensoryRoom.findMany({
			where: { clinicId: ctx.auth.tenantId! },
			orderBy: { createdAt: "asc" },
		});
	}),

	updateSensoryRoom: clinicAdminProcedure
		.input(UpdateSensoryRoomInput)
		.mutation(async ({ input, ctx }) => {
			const { id, ...data } = input;
			return prisma.sensoryRoom.update({
				where: { id, clinicId: ctx.auth.tenantId! },
				data,
			});
		}),

	toggleRoomStatus: clinicAdminProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ input, ctx }) => {
			const room = await prisma.sensoryRoom.findFirst({
				where: { id: input.id, clinicId: ctx.auth.tenantId! },
			});
			if (!room) throw new TRPCError({ code: "NOT_FOUND" });
			return prisma.sensoryRoom.update({
				where: { id: input.id },
				data: { status: room.status === "ACTIVE" ? "MAINTENANCE" : "ACTIVE" },
			});
		}),

	enableGame: clinicAdminProcedure
		.input(z.object({ gameId: z.string() }))
		.mutation(async ({ input, ctx }) => {
			return prisma.clinicGameEnable.upsert({
				where: {
					clinicId_gameId: {
						clinicId: ctx.auth.tenantId!,
						gameId: input.gameId,
					},
				},
				create: {
					clinicId: ctx.auth.tenantId!,
					gameId: input.gameId,
					enabled: true,
				},
				update: { enabled: true },
			});
		}),

	disableGame: clinicAdminProcedure
		.input(z.object({ gameId: z.string() }))
		.mutation(async ({ input, ctx }) => {
			await prisma.clinicGameEnable.upsert({
				where: {
					clinicId_gameId: {
						clinicId: ctx.auth.tenantId!,
						gameId: input.gameId,
					},
				},
				create: {
					clinicId: ctx.auth.tenantId!,
					gameId: input.gameId,
					enabled: false,
				},
				update: { enabled: false },
			});
		}),

	listEnabledGames: clinicAdminProcedure.query(async ({ ctx }) => {
		return prisma.game.findMany({
			where: {
				clinicEnables: {
					some: { clinicId: ctx.auth.tenantId!, enabled: true },
				},
			},
			orderBy: { name: "asc" },
		});
	}),
});
