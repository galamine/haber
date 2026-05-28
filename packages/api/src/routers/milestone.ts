import prisma from "@haber-final/db";

import { clinicAdminProcedure, protectedProcedure, router } from "../index";
import {
	AddClinicSubCategoryInput,
	AddMilestoneExtensionInput,
} from "../schemas/taxonomy";

export const milestoneRouter = router({
	list: protectedProcedure.query(async ({ ctx }) => {
		return prisma.milestone.findMany({
			where: {
				frameworkId: { in: ["global", `clinic_${ctx.auth.tenantId}`] },
			},
		});
	}),

	addClinicExtension: clinicAdminProcedure
		.input(AddMilestoneExtensionInput)
		.mutation(async ({ input, ctx }) => {
			return prisma.milestone.create({
				data: {
					frameworkId: `clinic_${ctx.auth.tenantId}`,
					description: input.description,
					ageMinMonths: input.ageMinMonths ?? null,
					ageMaxMonths: input.ageMaxMonths ?? null,
					scoringScaleMin: input.scoringScaleMin ?? null,
					scoringScaleMax: input.scoringScaleMax ?? null,
					extensions: input.extensions ?? {},
				},
			});
		}),

	listGameCategories: protectedProcedure.query(async ({ ctx }) => {
		return prisma.gameCategory.findMany({
			where: {
				OR: [{ clinicId: null }, { clinicId: ctx.auth.tenantId }],
			},
			orderBy: { name: "asc" },
		});
	}),

	addClinicSubCategory: clinicAdminProcedure
		.input(AddClinicSubCategoryInput)
		.mutation(async ({ input, ctx }) => {
			return prisma.gameCategory.create({
				data: {
					name: input.name,
					parentId: input.parentId ?? null,
					clinicId: ctx.auth.tenantId,
				},
			});
		}),
});
