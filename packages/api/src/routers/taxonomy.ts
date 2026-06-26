import prisma from "@haber-final/db";

import { clinicAdminProcedure, protectedProcedure, router } from "../index";
import { AddTaxonomyItemInput } from "../schemas/taxonomy";

export const taxonomyRouter: ReturnType<typeof router> = router({
	listDiagnoses: protectedProcedure.query(async ({ ctx }) => {
		return prisma.diagnosis.findMany({
			where: {
				OR: [{ clinicId: null }, { clinicId: ctx.auth.tenantId }],
			},
			orderBy: { label: "asc" },
		});
	}),

	listFunctionalConcerns: protectedProcedure.query(async ({ ctx }) => {
		return prisma.functionalConcern.findMany({
			where: {
				OR: [{ clinicId: null }, { clinicId: ctx.auth.tenantId }],
			},
			orderBy: { label: "asc" },
		});
	}),

	listAssessmentTools: protectedProcedure.query(async ({ ctx }) => {
		return prisma.assessmentTool.findMany({
			where: {
				OR: [{ clinicId: null }, { clinicId: ctx.auth.tenantId }],
			},
			orderBy: { label: "asc" },
		});
	}),

	listEquipment: protectedProcedure.query(async ({ ctx }) => {
		return prisma.equipment.findMany({
			where: {
				OR: [{ clinicId: null }, { clinicId: ctx.auth.tenantId }],
			},
			orderBy: { label: "asc" },
		});
	}),

	listInterventionApproaches: protectedProcedure.query(async ({ ctx }) => {
		return prisma.interventionApproach.findMany({
			where: {
				OR: [{ clinicId: null }, { clinicId: ctx.auth.tenantId }],
			},
			orderBy: { label: "asc" },
		});
	}),

	listSensorySystems: protectedProcedure.query(async () => {
		return prisma.sensorySystem.findMany({
			orderBy: { order: "asc" },
		});
	}),

	addClinicDiagnosis: clinicAdminProcedure
		.input(AddTaxonomyItemInput)
		.mutation(async ({ input, ctx }) => {
			return prisma.diagnosis.create({
				data: { label: input.label, clinicId: ctx.auth.tenantId },
			});
		}),

	addClinicEquipment: clinicAdminProcedure
		.input(AddTaxonomyItemInput)
		.mutation(async ({ input, ctx }) => {
			return prisma.equipment.create({
				data: { label: input.label, clinicId: ctx.auth.tenantId },
			});
		}),
});
