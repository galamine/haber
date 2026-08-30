import {
	CreatePlanInput,
	ModificationDecisionInput,
} from "@haber-final/api/schemas/plan";
import { z } from "zod";

export const PlanFormSchema = CreatePlanInput.extend({
	presetId: z.string().optional(),
	targetMilestones: z.array(z.string()).default([]),
});

export const ModifyPlanFormSchema = z.object({
	changes: z.object({
		name: z.string().optional(),
		programLengthWeeks: z.number().optional(),
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
