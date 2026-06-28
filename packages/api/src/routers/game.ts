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
	CreateGameInput,
	CreateGameVersionInput,
	CreateSubCategoryInput,
	EnableDisableGameInput,
	GameListInput,
	UpdateGameInput,
} from "../schemas/game";

export const gameRouter = router({
	create: adminProcedure.input(CreateGameInput).mutation(async ({ input }) => {
		return prisma.$transaction(async (tx) => {
			const game = await tx.game.create({ data: input });
			await tx.gameVersion.create({
				data: {
					gameId: game.id,
					versionNumber: "1",
					rubricVersion: "1",
					scoringSchema: {},
					isLatest: true,
				},
			});
			return game;
		});
	}),

	createVersion: adminProcedure
		.input(CreateGameVersionInput)
		.mutation(async ({ input }) => {
			return prisma.$transaction(async (tx) => {
				await tx.gameVersion.updateMany({
					where: { gameId: input.gameId, isLatest: true },
					data: { isLatest: false },
				});
				return tx.gameVersion.create({
					data: {
						gameId: input.gameId,
						versionNumber: input.versionNumber,
						rubricVersion: input.rubricVersion,
						scoringSchema: JSON.parse(JSON.stringify(input.scoringSchema)),
						isLatest: true,
					},
				});
			});
		}),

	update: adminProcedure.input(UpdateGameInput).mutation(async ({ input }) => {
		const { id, ...data } = input;
		return prisma.game.update({ where: { id }, data });
	}),

	deprecate: adminProcedure
		.input(EnableDisableGameInput)
		.mutation(async ({ input }) => {
			await prisma.gameVersion.updateMany({
				where: { gameId: input.gameId, isLatest: true },
				data: { isLatest: false },
			});
			return { success: true };
		}),

	get: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ input }) => {
			const game = await prisma.game.findUnique({
				where: { id: input.id },
				include: { versions: { orderBy: { createdAt: "desc" } } },
			});
			if (!game) throw new TRPCError({ code: "NOT_FOUND" });
			return game;
		}),

	list: protectedProcedure
		.input(GameListInput)
		.query(async ({ ctx, input }) => {
			const { page, pageSize, enabledForClinic, ...filters } = input;
			const skip = (page - 1) * pageSize;

			const where: any = {};

			if (filters.search)
				where.name = { contains: filters.search, mode: "insensitive" };
			if (filters.categoryId) where.categoryId = filters.categoryId;
			if (filters.subCategory) where.subCategory = filters.subCategory;
			if (filters.difficulty) where.difficulty = filters.difficulty;
			if (filters.ageRangeMin) where.ageRangeMin = { gte: filters.ageRangeMin };
			if (filters.ageRangeMax) where.ageRangeMax = { lte: filters.ageRangeMax };
			if (filters.targetIssues)
				where.targetIssues = { hasSome: [filters.targetIssues] };

			if (enabledForClinic === true) {
				const tenantId = ctx.auth.tenantId;
				where.OR = [
					{
						isGlobal: true,
						NOT: {
							clinicEnables: { some: { clinicId: tenantId!, enabled: false } },
						},
					},
					{
						clinicEnables: { some: { clinicId: tenantId!, enabled: true } },
					},
				];
			}

			const [items, total] = await prisma.$transaction([
				prisma.game.findMany({
					where,
					skip,
					take: pageSize,
					orderBy: { createdAt: "desc" },
					include: { versions: { where: { isLatest: true }, take: 1 } },
				}),
				prisma.game.count({ where }),
			]);

			return { items, total, page, totalPages: Math.ceil(total / pageSize) };
		}),

	listCategories: protectedProcedure.query(async ({ ctx }) => {
		return prisma.gameCategory.findMany({
			where: {
				OR: [{ clinicId: null }, { clinicId: ctx.auth.tenantId }],
			},
			orderBy: { name: "asc" },
		});
	}),

	listEnabledForClinic: protectedProcedure.query(async ({ ctx }) => {
		return prisma.game.findMany({
			where: {
				clinicEnables: {
					some: { clinicId: ctx.auth.tenantId!, enabled: true },
				},
			},
			orderBy: { name: "asc" },
		});
	}),

	createSubCategory: clinicAdminProcedure
		.input(CreateSubCategoryInput)
		.mutation(async ({ input, ctx }) => {
			return prisma.gameCategory.create({
				data: {
					name: input.name,
					parentId: input.parentId,
					clinicId: ctx.auth.tenantId,
				},
			});
		}),

	enableForClinic: clinicAdminProcedure
		.input(EnableDisableGameInput)
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
					enabled: true,
				},
				update: { enabled: true },
			});
		}),

	disableForClinic: clinicAdminProcedure
		.input(EnableDisableGameInput)
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
});
