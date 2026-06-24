import { z } from "zod";

export const ConsentStatusSchema = z.enum(["PENDING", "GRANTED", "WITHDRAWN"]);

export const GuardianInput = z.object({
	name: z.string(),
	relation: z.string(),
	phone: z.string(),
	email: z.string().email(),
});

export const MedicalHistoryInput = z.object({
	birthHistory: z.string().optional(),
	immunisations: z.string().optional(),
	allergies: z.string().optional(),
	currentMedications: z.string().optional(),
	priorDiagnoses: z.string().optional(),
	familyHistory: z.string().optional(),
	sensorySensitivities: z.string().optional(),
});

export const CreateChildInput = z.object({
	opNumber: z.string(),
	fullName: z.string(),
	dob: z.coerce.date(),
	sex: z.string(),
	photoUrl: z.string().optional(),
	address: z.string().optional(),
	heightCm: z.number().optional(),
	weightKg: z.number().optional(),
	weightMeasuredAt: z.coerce.date().optional(),
	spokenLanguages: z.array(z.string()),
	school: z.string().optional(),
	preferredTherapistId: z.string().optional(),
	guardian: GuardianInput,
});

export const UpdateChildInput = z.object({
	id: z.string(),
	opNumber: z.string().optional(),
	fullName: z.string().optional(),
	dob: z.coerce.date().optional(),
	sex: z.string().optional(),
	photoUrl: z.string().optional(),
	address: z.string().optional(),
	heightCm: z.number().optional(),
	weightKg: z.number().optional(),
	weightMeasuredAt: z.coerce.date().optional(),
	spokenLanguages: z.array(z.string()).optional(),
	school: z.string().optional(),
	preferredTherapistId: z.string().optional(),
});

export const ChildListInput = z.object({
	page: z.number().int().positive().default(1),
	pageSize: z.number().int().positive().max(100).default(20),
	search: z.string().optional(),
	therapistId: z.string().optional(),
	consentStatus: ConsentStatusSchema.optional(),
});

export const AssignTherapistInput = z.object({
	childId: z.string(),
	therapistId: z.string(),
	reviewDueAt: z.coerce.date().optional(),
});

export const UnassignTherapistInput = z.object({
	childId: z.string(),
	therapistId: z.string(),
});

export const ListAssignedChildrenInput = z.object({
	page: z.number().int().positive().default(1),
	pageSize: z.number().int().positive().max(100).default(20),
});
