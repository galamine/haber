import { z } from "zod";

export const ConsentTypeSchema = z.enum([
	"TREATMENT",
	"DATA_PROCESSING",
	"IMAGE_VIDEO_CAPTURE",
]);

export const ConsentStatusSchema = z.enum(["PENDING", "GRANTED", "WITHDRAWN"]);

export const RecordConsentInput = z.object({
	childId: z.string(),
	consentType: ConsentTypeSchema,
	typedName: z.string().min(1),
	checkbox: z.literal(true),
});

export const WithdrawConsentInput = z.object({
	childId: z.string(),
});

export const RestoreConsentInput = z.object({
	childId: z.string(),
});

export const ConsentEntrySchema = z.object({
	consented: z.boolean(),
	typedName: z.string().nullable(),
	timestamp: z.date().nullable(),
});

export const ConsentStatusSummarySchema = z.object({
	status: ConsentStatusSchema,
	consents: z.object({
		TREATMENT: ConsentEntrySchema,
		DATA_PROCESSING: ConsentEntrySchema,
		IMAGE_VIDEO_CAPTURE: ConsentEntrySchema,
	}),
});
