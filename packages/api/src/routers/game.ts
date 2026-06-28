import prisma from "@haber-final/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
	adminProcedure,
	clinicAdminProcedure,
	protectedProcedure,
	router,
} from "../index";
import {
	ClinicGameEnableInput,
	CreateGameInput,
	CreateGameVersionInput,
	CreateSubCategoryInput,
	ListGamesInput,
	UpdateGameInput,
} from "../schemas/game";

export const gameRouter: ReturnType<typeof router> = router({
	create: adminProcedure.input(CreateGameInput).mutation(async ({ input }) => {
		return prisma.game.create({
			data: {
				name: input.name,
				description: input.description,
				categoryId: input.categoryId,
				subCategory: input.subCategory,
				targetIssues: input.targetIssues,
				difficulty: input.difficulty,
				ageRangeMin: input.ageRangeMin,
				ageRangeMax: input.ageRangeMax,
				isGlobal: input.isGlobal,
			},
		});
	}),

	createVersion: adminProcedure
		.input(CreateGameVersionInput)
		.mutation(async ({ input }) => {
			await prisma.gameVersion.updateMany({
				where: { gameId: input.gameId },
				data: { isLatest: false },
			});

			return prisma.gameVersion.create({
				data: {
					gameId: input.gameId,
					versionNumber: input.versionNumber,
					rubricVersion: input.rubricVersion,
					scoringSchema: input.scoringSchema,
					isLatest: true,
				},
			});
		}),

	get: protectedProcedure
		.input(z.object({ gameId: z.string() }))
		.query(async ({ input }) => {
			const game = await prisma.game.findUnique({
				where: { id: input.gameId },
				include: {
					versions: { orderBy: { createdAt: "desc" } },
					clinicEnables: true,
				},
			});
			if (!game) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}
			return game;
		}),

	list: protectedProcedure
		.input(ListGamesInput)
		.query(async ({ input, ctx }) => {
			const where: Record<string, unknown> = {};

			if (input.categoryId) {
				where.categoryId = input.categoryId;
			}

			if (input.search) {
				where.OR = [
					{ name: { contains: input.search, mode: "insensitive" } },
					{ description: { contains: input.search, mode: "insensitive" } },
				];
			}

			if (input.enabledForClinic && ctx.auth.tenantId) {
				where.OR = [
					{
						clinicEnables: {
							some: { clinicId: ctx.auth.tenantId, enabled: true },
						},
					},
					{ isGlobal: true },
				];
				where.NOT = {
					clinicEnables: {
						some: { clinicId: ctx.auth.tenantId, enabled: false },
					},
				};
			}

			const [items, total] = await prisma.$transaction([
				prisma.game.findMany({
					where,
					skip: (input.page - 1) * input.pageSize,
					take: input.pageSize,
					orderBy: { createdAt: "desc" },
					include: {
						versions: { where: { isLatest: true } },
						clinicEnables: true,
					},
				}),
				prisma.game.count({ where }),
			]);

			return {
				items,
				total,
				page: input.page,
				totalPages: Math.ceil(total / input.pageSize),
			};
		}),

	update: adminProcedure
		.input(UpdateGameInput.merge(z.object({ gameId: z.string() })))
		.mutation(async ({ input }) => {
			const { gameId, ...data } = input;
			return prisma.game.update({
				where: { id: gameId },
				data,
			});
		}),

	deprecate: adminProcedure
		.input(z.object({ gameVersionId: z.string() }))
		.mutation(async ({ input }) => {
			return prisma.gameVersion.update({
				where: { id: input.gameVersionId },
				data: { isLatest: false },
			});
		}),

	listCategories: protectedProcedure.query(async () => {
		return prisma.gameCategory.findMany({
			where: { parentId: null },
			include: { children: true },
			orderBy: { name: "asc" },
		});
	}),

	createSubCategory: clinicAdminProcedure
		.input(CreateSubCategoryInput)
		.mutation(async ({ input, ctx }) => {
			if (!ctx.auth.tenantId) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "Tenant ID is required",
				});
			}
			const parent = await prisma.gameCategory.findUnique({
				where: { id: input.parentId },
			});
			if (!parent || parent.clinicId !== null) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Parent category must be a global category",
				});
			}

			return prisma.gameCategory.create({
				data: {
					name: input.name,
					parentId: input.parentId,
					clinicId: ctx.auth.tenantId,
				},
			});
		}),

	enableForClinic: clinicAdminProcedure
		.input(ClinicGameEnableInput)
		.mutation(async ({ input, ctx }) => {
			if (!ctx.auth.tenantId) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "Tenant ID is required",
				});
			}
			return prisma.clinicGameEnable.upsert({
				where: {
					clinicId_gameId: {
						clinicId: ctx.auth.tenantId,
						gameId: input.gameId,
					},
				},
				update: { enabled: input.enabled },
				create: {
					clinicId: ctx.auth.tenantId,
					gameId: input.gameId,
					enabled: input.enabled,
				},
			});
		}),

	disableForClinic: clinicAdminProcedure
		.input(z.object({ gameId: z.string() }))
		.mutation(async ({ input, ctx }) => {
			if (!ctx.auth.tenantId) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "Tenant ID is required",
				});
			}
			return prisma.clinicGameEnable.upsert({
				where: {
					clinicId_gameId: {
						clinicId: ctx.auth.tenantId,
						gameId: input.gameId,
					},
				},
				update: { enabled: false },
				create: {
					clinicId: ctx.auth.tenantId,
					gameId: input.gameId,
					enabled: false,
				},
			});
		}),

	listEnabledForClinic: protectedProcedure.query(async ({ ctx }) => {
		if (!ctx.auth.tenantId) {
			return [];
		}

		return prisma.game.findMany({
			where: {
				OR: [
					{
						clinicEnables: {
							some: { clinicId: ctx.auth.tenantId, enabled: true },
						},
					},
					{ isGlobal: true },
				],
				NOT: {
					clinicEnables: {
						some: { clinicId: ctx.auth.tenantId, enabled: false },
					},
				},
			},
			include: {
				versions: { where: { isLatest: true } },
				clinicEnables: true,
			},
		});
	}),
});
