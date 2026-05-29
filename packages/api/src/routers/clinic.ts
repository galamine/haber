import prisma from "@haber-final/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { adminProcedure, clinicAdminProcedure, router } from "../index";
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
