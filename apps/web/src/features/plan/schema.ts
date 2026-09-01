import { CreatePlanInput } from "@haber-final/api/schemas/plan";
import { z } from "zod";

export const PlanFormSchema = CreatePlanInput.extend({
	presetId: z.string().optional(),
	targetMilestones: z.array(z.string()).default([]),
	customGoals: z
		.object({
			short_term: z.array(z.string()).default([]),
			long_term: z.array(z.string()).default([]),
		})
		.default({ short_term: [], long_term: [] }),
});

export type PlanFormValues = z.infer<typeof PlanFormSchema>;

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
		};
	}
	return {
		sessionDurationMinutes: 60,
	};
}
