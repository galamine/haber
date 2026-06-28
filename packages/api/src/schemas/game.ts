import { z } from "zod";

export const CreateGameInput = z.object({
	name: z.string().min(1),
	description: z.string().optional(),
	categoryId: z.string(),
	subCategory: z.string().optional(),
	targetIssues: z.array(z.string()).default([]),
	difficulty: z.string().optional(),
	ageRangeMin: z.number().int().optional(),
	ageRangeMax: z.number().int().optional(),
	isGlobal: z.boolean().default(true),
});

export const CreateGameVersionInput = z.object({
	gameId: z.string(),
	versionNumber: z.string(),
	rubricVersion: z.string(),
	scoringSchema: z.record(z.unknown()).default({}),
});

export const UpdateGameInput = z.object({
	name: z.string().min(1).optional(),
	description: z.string().optional(),
	subCategory: z.string().optional(),
	targetIssues: z.array(z.string()).optional(),
	difficulty: z.string().optional(),
	ageRangeMin: z.number().int().optional(),
	ageRangeMax: z.number().int().optional(),
});

export const ListGamesInput = z.object({
	page: z.number().int().positive().default(1),
	pageSize: z.number().int().positive().max(100).default(20),
	enabledForClinic: z.boolean().optional(),
	categoryId: z.string().optional(),
	search: z.string().optional(),
});

export const CreateSubCategoryInput = z.object({
	name: z.string().min(1),
	parentId: z.string(),
});

export const ClinicGameEnableInput = z.object({
	gameId: z.string(),
	enabled: z.boolean(),
});
