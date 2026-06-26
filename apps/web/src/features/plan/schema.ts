import {
	CreatePlanInput,
	ModificationDecisionInput,
} from "@haber-final/api/schemas/plan";
import { z } from "zod";

export const PlanFormSchema = CreatePlanInput.extend({
	presetId: z.string().optional(),
	phases: z
		.array(
			z.object({
				phase: z.string(),
				weeks: z.number(),
				label: z.string(),
			}),
		)
		.default([]),
	targetMilestones: z.array(z.string()).default([]),
});

export const ModifyPlanFormSchema = z.object({
	changes: z.object({
		name: z.string().optional(),
		programLengthWeeks: z.number().optional(),
		phases: z
			.array(
				z.object({
					phase: z.string(),
					weeks: z.number(),
					label: z.string(),
				}),
			)
			.optional(),
		startDate: z.coerce.date().optional(),
		targetMilestones: z.array(z.string()).optional(),
		sessionDurationMinutes: z.number().optional(),
	}),
	goalDecisions: z.array(ModificationDecisionInput),
});

export type PlanFormValues = z.infer<typeof PlanFormSchema>;
export type ModifyPlanFormValues = z.infer<typeof ModifyPlanFormSchema>;

export function buildPlanDefaultValues({
	preset,
}: {
	preset?:
		| {
				session_duration_minutes: number;
				case_label: string;
				session_structure: { phase: string; minutes: number; label: string }[];
		  }
		| undefined;
}) {
	if (preset) {
		return {
			sessionDurationMinutes: preset.session_duration_minutes,
			name: preset.case_label,
			phases: preset.session_structure.map((s) => ({
				phase: s.phase,
				weeks: s.minutes,
				label: s.label,
			})),
		};
	}
	return {
		sessionDurationMinutes: 60,
		phases: [],
	};
}
