import { z } from "zod";

export const CreatePlanInput = z.object({
	childId: z.string(),
	name: z.string(),
	programLengthWeeks: z.number().int().positive(),
	startDate: z.coerce.date().optional(),
	targetMilestones: z.array(z.string()).optional(),
	sessionDurationMinutes: z.number().int().positive().optional(),
	presetId: z.string().optional(),
	customGoals: z
		.object({
			short_term: z.array(z.string()).default([]),
			long_term: z.array(z.string()).default([]),
		})
		.optional(),
});

export const ModificationDecisionInput = z.object({
	goalId: z.string(),
	action: z.enum(["CARRY_OVER", "CLOSE", "MODIFY"]),
	newDescription: z.string().optional(),
	newHorizon: z.enum(["SHORT_TERM", "LONG_TERM"]).optional(),
	newTargetAttainmentPct: z.number().int().min(0).max(100).optional(),
});

export const ModifyPlanInput = z.object({
	planId: z.string(),
	changes: z.object({
		name: z.string().optional(),
		programLengthWeeks: z.number().int().positive().optional(),
		startDate: z.coerce.date().optional(),
		targetMilestones: z.array(z.string()).optional(),
		sessionDurationMinutes: z.number().int().positive().optional(),
	}),
	goalDecisions: z.array(ModificationDecisionInput),
});

export const PlanPresetSchema = z.object({
	preset_id: z.string(),
	case_label: z.string(),
	linked_diagnoses: z.array(z.string()),
	session_duration_minutes: z.number(),
	session_structure: z.array(
		z.object({
			phase: z.string(),
			minutes: z.number(),
			label: z.string(),
		}),
	),
	short_term_goals_template: z.array(z.string()),
	long_term_goals_template: z.array(z.string()),
	home_program: z.string(),
});
