import { z } from "zod";

export const StartSessionInput = z.object({
	assessmentId: z.string(),
	assessmentType: z.enum(["initial", "follow-up"]),
});

export const SessionIdInput = z.object({
	sessionId: z.string(),
});

export const ProcessAudioChunkInput = z.object({
	sessionId: z.string(),
	audioData: z.string(),
	chunkIndex: z.number().int().min(0),
});

export const LogOverrideInput = z.object({
	sessionId: z.string(),
	fieldId: z.string(),
	aiValue: z.unknown(),
	overrideValue: z.unknown(),
});

export const GetFormSchemaInput = z.object({
	assessmentType: z.enum(["initial", "follow-up"]),
});

export const AIDraftValueSchema = z.object({
	id: z.string(),
	sessionId: z.string(),
	fieldId: z.string(),
	value: z.unknown(),
	confidence: z.enum(["high", "medium", "low"]),
	sourceText: z.string().nullable(),
	status: z.enum(["active", "superseded"]),
	createdAt: z.date(),
});

export const AIFieldOverrideSchema = z.object({
	id: z.string(),
	sessionId: z.string(),
	fieldId: z.string(),
	aiValue: z.unknown(),
	overrideValue: z.unknown(),
	overrideAt: z.date(),
});

export const ConversationSessionSchema = z.object({
	id: z.string(),
	assessmentId: z.string(),
	assessmentType: z.enum(["initial", "follow-up"]),
	status: z.enum(["active", "paused", "completed"]),
	startedAt: z.date(),
	endedAt: z.date().nullable(),
	draftValues: z.array(AIDraftValueSchema),
	overrides: z.array(AIFieldOverrideSchema),
});

export const ProcessAudioChunkOutputSchema = z.object({
	drafts: z.array(
		z.object({
			id: z.string(),
			fieldId: z.string(),
			value: z.unknown(),
			confidence: z.enum(["high", "medium", "low"]),
			sourceText: z.string().nullable(),
			status: z.enum(["active", "superseded"]),
			createdAt: z.date(),
		}),
	),
	transcriptSoFar: z.string(),
});
