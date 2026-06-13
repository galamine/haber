import { z } from "zod";

export const DiagnosisSchema = z.object({
	id: z.string(),
	label: z.string(),
	clinicId: z.string().nullable(),
});

export const FunctionalConcernSchema = z.object({
	id: z.string(),
	label: z.string(),
	clinicId: z.string().nullable(),
});

export const AssessmentToolSchema = z.object({
	id: z.string(),
	label: z.string(),
	clinicId: z.string().nullable(),
});

export const EquipmentSchema = z.object({
	id: z.string(),
	label: z.string(),
	clinicId: z.string().nullable(),
});

export const InterventionApproachSchema = z.object({
	id: z.string(),
	label: z.string(),
	clinicId: z.string().nullable(),
});

export const SensorySystemSchema = z.object({
	id: z.string(),
	label: z.string(),
	order: z.number(),
});

export const MilestoneSchema = z.object({
	id: z.string(),
	frameworkId: z.string(),
	ageMinMonths: z.number().nullable(),
	ageMaxMonths: z.number().nullable(),
	scoringScaleMin: z.number().nullable(),
	scoringScaleMax: z.number().nullable(),
	description: z.string(),
	parentMilestoneId: z.string().nullable(),
	extensions: z.unknown(),
});

export const GameCategorySchema = z.object({
	id: z.string(),
	name: z.string(),
	clinicId: z.string().nullable(),
	parentId: z.string().nullable(),
});

export const AddTaxonomyItemInput = z.object({
	label: z.string().min(1).max(200),
});

export const AddMilestoneExtensionInput = z.object({
	description: z.string().min(1).max(500),
	ageMinMonths: z.number().int().nonnegative().nullish(),
	ageMaxMonths: z.number().int().nonnegative().nullish(),
	scoringScaleMin: z.number().int().nullish(),
	scoringScaleMax: z.number().int().nullish(),
	extensions: z.record(z.string(), z.any()).optional(),
});

export const AddClinicSubCategoryInput = z.object({
	name: z.string().min(1).max(200),
	parentId: z.string().nullish(),
});
