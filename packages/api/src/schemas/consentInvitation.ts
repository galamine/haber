import { z } from "zod";

export const SendConsentInput = z.object({
	childId: z.string(),
});

export const ValidateTokenInput = z.object({
	token: z.string(),
});

export const SubmitConsentInput = z.object({
	token: z.string(),
	typedName: z.string().min(1),
});

export const ConsentInvitationSummarySchema = z.object({
	id: z.string(),
	childId: z.string(),
	childName: z.string(),
	guardianName: z.string().nullable(),
	guardianEmail: z.string().nullable(),
	expiresAt: z.date(),
	alreadyUsed: z.boolean(),
	createdAt: z.date(),
});
