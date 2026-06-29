import { z } from "zod";

export const CreateGameInput = z.object({
	name: z.string().min(1).max(200),
	description: z.string().optional(),
	categoryId: z.string(),
	subCategory: z.string().optional(),
	targetIssues: z.array(z.string()).default([]),
	difficulty: z.string().optional(),
	ageRangeMin: z.number().int().nonnegative().optional(),
	ageRangeMax: z.number().int().nonnegative().optional(),
	isGlobal: z.boolean().default(true),
	clinicIds: z.array(z.string()).optional(),
});

export const UpdateGameInput = z.object({
	id: z.string(),
	name: z.string().min(1).max(200).optional(),
	description: z.string().optional(),
	categoryId: z.string().optional(),
	subCategory: z.string().optional(),
	targetIssues: z.array(z.string()).optional(),
	difficulty: z.string().optional(),
	ageRangeMin: z.number().int().nonnegative().optional(),
	ageRangeMax: z.number().int().nonnegative().optional(),
	isGlobal: z.boolean().optional(),
	clinicIds: z.array(z.string()).optional(),
});

export const CreateGameVersionInput = z.object({
	gameId: z.string(),
	versionNumber: z.string(),
	rubricVersion: z.string(),
	scoringSchema: z.record(z.string(), z.unknown()).default({}),
});

export const GameListInput = z.object({
	page: z.number().int().positive().default(1),
	pageSize: z.number().int().positive().max(100).default(20),
	search: z.string().optional(),
	categoryId: z.string().optional(),
	subCategory: z.string().optional(),
	targetIssues: z.array(z.string()).optional(),
	difficulty: z.string().optional(),
	ageRangeMin: z.number().int().nonnegative().optional(),
	ageRangeMax: z.number().int().nonnegative().optional(),
	enabledForClinic: z.boolean().optional(),
});

export const CreateSubCategoryInput = z.object({
	name: z.string().min(1).max(200),
	parentId: z.string(),
});

export const EnableDisableGameInput = z.object({
	gameId: z.string(),
});
