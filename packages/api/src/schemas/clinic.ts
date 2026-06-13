import { z } from "zod";

export const CreateClinicInput = z.object({
	name: z.string().min(1).max(200),
	address: z.string().min(1),
	contactName: z.string().min(1),
	contactPhone: z.string().min(1),
	contactEmail: z.string().email(),
	timezone: z.string().optional(),
});

export const UpdateClinicInput = z.object({
	id: z.string(),
	name: z.string().min(1).max(200).optional(),
	address: z.string().min(1).optional(),
	contactName: z.string().min(1).optional(),
	contactPhone: z.string().min(1).optional(),
	contactEmail: z.string().email().optional(),
	timezone: z.string().optional(),
});

export const ClinicListInput = z.object({
	page: z.number().int().positive().default(1),
	pageSize: z.number().int().positive().max(100).default(20),
});

export const CreateDepartmentInput = z.object({
	name: z.string().min(1).max(200),
	headUserId: z.string().optional(),
	description: z.string().optional(),
});

export const UpdateDepartmentInput = z.object({
	id: z.string(),
	name: z.string().min(1).max(200).optional(),
	headUserId: z.string().nullable().optional(),
	description: z.string().nullable().optional(),
});

export const CreateSensoryRoomInput = z.object({
	code: z.string().min(1).max(50),
	name: z.string().min(1).max(200),
	departmentId: z.string().optional(),
	equipmentList: z.array(z.any()).default([]),
	status: z.enum(["ACTIVE", "MAINTENANCE"]).optional(),
});

export const UpdateSensoryRoomInput = z.object({
	id: z.string(),
	code: z.string().min(1).max(50).optional(),
	name: z.string().min(1).max(200).optional(),
	departmentId: z.string().nullable().optional(),
	equipmentList: z.array(z.any()).optional(),
	status: z.enum(["ACTIVE", "MAINTENANCE"]).optional(),
});
