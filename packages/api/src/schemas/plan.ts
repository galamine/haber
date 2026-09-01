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
	publish: z.boolean().optional(),
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
