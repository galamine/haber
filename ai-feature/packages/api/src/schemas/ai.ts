import { z } from "zod";

export const StartCaptureInput = z.object({
	childId: z.string(),
	assessmentId: z.string().optional(),
	assessmentType: z.enum(["initial", "follow-up"]),
});

export const CaptureIdInput = z.object({
	captureId: z.string(),
});

export const ProcessAudioChunkInput = z.object({
	captureId: z.string(),
	audioData: z.string(),
});

export const LogOverrideInput = z.object({
	captureId: z.string(),
	fieldId: z.string(),
	aiValue: z.unknown(),
	overrideValue: z.unknown(),
});

export const GetFormSchemaInput = z.object({
	assessmentType: z.enum(["initial", "follow-up"]),
});

export const CaptureDraftValueSchema = z.object({
	id: z.string(),
	captureId: z.string(),
	fieldId: z.string(),
	value: z.unknown(),
	confidence: z.enum(["high", "medium", "low"]),
	sourceText: z.string().nullable(),
	status: z.enum(["active", "superseded"]),
	createdAt: z.date(),
});

export const CaptureOverrideSchema = z.object({
	id: z.string(),
	captureId: z.string(),
	fieldId: z.string(),
	aiValue: z.unknown(),
	overrideValue: z.unknown(),
	overrideAt: z.date(),
});

export const AssessmentCaptureSchema = z.object({
	id: z.string(),
	childId: z.string(),
	assessmentId: z.string().nullable(),
	assessmentType: z.enum(["initial", "follow-up"]),
	status: z.enum(["active", "paused", "completed"]),
	startedAt: z.date(),
	endedAt: z.date().nullable(),
	draftValues: z.array(CaptureDraftValueSchema),
	overrides: z.array(CaptureOverrideSchema),
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
