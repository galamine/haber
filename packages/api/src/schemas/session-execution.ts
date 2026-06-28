import { z } from "zod";

export const AssignRoomInput = z.object({
	sessionId: z.string(),
	roomId: z.string(),
});

export const ManualCloseInput = z.object({
	sessionId: z.string(),
	notes: z.string().optional(),
	qualityTag: z.enum(["CALM", "DISTRACTED", "REFUSED"]).optional(),
});

export const GetWebhookUrlInput = z.object({
	sessionId: z.string(),
	gameId: z.string(),
	gameVersion: z.string(),
});

export const ClaimCoverageInput = z.object({
	sessionId: z.string(),
});

export const WebhookStartBody = z.object({
	webhook_secret: z.string(),
});

export const WebhookCompleteBody = z.object({
	webhook_secret: z.string(),
	scored: z.object({ score: z.number(), rubric_version: z.string() }),
	raw_metrics: z.record(z.unknown()),
	events: z.array(z.unknown()),
});
