import { z } from "zod";

export const CreateGoalInput = z.object({
	treatmentPlanId: z.string(),
	description: z.string(),
	horizon: z.enum(["SHORT_TERM", "LONG_TERM"]),
	targetAttainmentPct: z.number().int().min(0).max(100).default(100),
});

export const UpdateGoalAttainmentInput = z.object({
	goalId: z.string(),
	attainmentPct: z.number().int().min(0).max(100),
	status: z.enum(["MET", "IN_PROGRESS", "NOT_MET", "DISCONTINUED"]),
	evidenceNotes: z.string().optional(),
	followUpId: z.string(),
});

export const PlanModificationDecisionInput = z.object({
	goalId: z.string(),
	action: z.enum(["continue", "modify", "discontinue", "add"]),
	newDescription: z.string().optional(),
	newHorizon: z.enum(["SHORT_TERM", "LONG_TERM"]).optional(),
	newTargetPct: z.number().int().min(0).max(100).optional(),
});

export const ApplyPlanModificationDecisionsInput = z.object({
	decisions: z.array(PlanModificationDecisionInput),
	newGoals: z
		.array(
			z.object({
				description: z.string(),
				targetAttainmentPct: z.number().int().min(0).max(100),
				horizon: z
					.enum(["SHORT_TERM", "LONG_TERM"])
					.optional()
					.default("SHORT_TERM"),
			}),
		)
		.optional()
		.default([]),
	newPlanId: z.string(),
});

export const GoalSchema = z.object({
	id: z.string(),
	treatmentPlanId: z.string(),
	description: z.string(),
	horizon: z.enum(["SHORT_TERM", "LONG_TERM"]),
	targetAttainmentPct: z.number().int(),
	currentAttainmentPct: z.number().int(),
	status: z.enum(["MET", "IN_PROGRESS", "NOT_MET", "DISCONTINUED"]),
	supersededByGoalId: z.string().nullable(),
	createdAt: z.date(),
});

export const GoalProgressEntrySchema = z.object({
	id: z.string(),
	goalId: z.string(),
	followUpId: z.string(),
	attainmentPct: z.number().int(),
	status: z.enum(["MET", "IN_PROGRESS", "NOT_MET", "DISCONTINUED"]),
	evidenceNotes: z.string().nullable(),
	recordedAt: z.date(),
});
