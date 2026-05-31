import { z } from "zod";

export const ConsentTypeSchema = z.enum([
	"TREATMENT",
	"DATA_PROCESSING",
	"IMAGE_VIDEO_CAPTURE",
]);

export const ConsentStatusSchema = z.enum(["PENDING", "GRANTED", "WITHDRAWN"]);

export const RecordConsentInput = z.object({
	childId: z.string(),
	guardianId: z.string(),
	consentType: ConsentTypeSchema,
	typedName: z.string().min(1),
	checkbox: z.literal(true),
});

export const WithdrawConsentInput = z.object({
	childId: z.string(),
	guardianId: z.string(),
	reason: z.string().optional(),
});

export const RestoreConsentInput = z.object({
	childId: z.string(),
	guardianId: z.string(),
});

const GuardianConsentEntrySchema = z.object({
	consented: z.boolean(),
	typedName: z.string().nullable(),
	timestamp: z.date().nullable(),
});

const GuardianConsentSummarySchema = z.object({
	guardianId: z.string(),
	name: z.string(),
	relation: z.string(),
	consents: z.object({
		TREATMENT: GuardianConsentEntrySchema,
		DATA_PROCESSING: GuardianConsentEntrySchema,
		IMAGE_VIDEO_CAPTURE: GuardianConsentEntrySchema,
	}),
});

export const ConsentStatusSummarySchema = z.object({
	status: ConsentStatusSchema,
	guardians: z.array(GuardianConsentSummarySchema),
});
