import {
	FollowUpSectionASchema,
	FollowUpSectionBSchema,
	FollowUpSectionCSchema,
	FollowUpSectionDSchema,
	FollowUpSectionESchema,
	FollowUpSectionFSchema,
	GoalProgressInputSchema,
} from "@haber-final/api/schemas/assessment";
import { z } from "zod";

export const FollowUpFormSchema = z.object({
	sectionA: FollowUpSectionASchema,
	sectionB: FollowUpSectionBSchema.extend({
		goalProgress: z.array(GoalProgressInputSchema),
	}),
	sectionC: FollowUpSectionCSchema,
	sectionD: FollowUpSectionDSchema.extend({
		equipmentEffectivelyUsed: z.array(z.string()),
	}),
	sectionE: FollowUpSectionESchema,
	sectionF: FollowUpSectionFSchema.extend({
		consentObtained: z.literal(true),
	}),
});
export type FollowUpFormValues = z.infer<typeof FollowUpFormSchema>;

export const FOLLOWUP_EMPTY_DEFAULTS: FollowUpFormValues = {
	sectionA: {
		date: "",
		therapistId: "",
		sessionNumber: 0,
		weeksSinceInitial: 0,
		parentPresent: false,
	},
	sectionB: {
		goalProgress: [],
	},
	sectionC: {
		sensoryCheck: [],
	},
	sectionD: {
		improvementsAtHome: "",
		improvementsAtSchool: "",
		regressions: undefined,
		homeProgramCompliance: "",
		sessionEngagement: "",
		schoolPerformanceChanges: "",
		behaviourChanges: "",
		newSkillsObserved: "",
		equipmentEffectivelyUsed: [],
		therapistObservations: "",
	},
	sectionE: {
		goalStatusDecisions: [],
		updatedGoals: [],
		updatedHomeProgram: "",
		nextFollowUpDate: "",
		nextAssessmentType: "",
		clinicalNotes: "",
	},
	sectionF: {
		therapistName: "",
		guardianName: "",
	},
};

type ActivePlan = {
	goals: {
		id: string;
		description: string;
		horizon: string;
		status: string;
		targetAttainmentPct: number;
	}[];
} | null;

type InitialAssessment = {
	createdAt: Date;
	sectionD: {
		sensoryProfile: { systemId: string; rating: number }[];
	};
};

export function buildFollowUpDefaultValues({
	initialAssessment,
	therapistId,
	sessionNumber,
	activePlan,
}: {
	initialAssessment: InitialAssessment;
	therapistId: string;
	sessionNumber: number;
	activePlan: ActivePlan;
}): FollowUpFormValues {
	const weeksSinceInitial = Math.round(
		(Date.now() - new Date(initialAssessment.createdAt).getTime()) /
			(7 * 24 * 60 * 60 * 1000),
	);

	return {
		...FOLLOWUP_EMPTY_DEFAULTS,
		sectionA: {
			date: new Date().toISOString().slice(0, 10),
			therapistId,
			sessionNumber,
			weeksSinceInitial,
			parentPresent: false,
		},
		sectionC: {
			sensoryCheck: initialAssessment.sectionD.sensoryProfile.map((r) => ({
				systemId: r.systemId,
				rating: r.rating,
				notes: "",
			})),
		},
		sectionB: {
			goalProgress: (activePlan?.goals ?? [])
				.filter((g) => g.status === "IN_PROGRESS")
				.map((g) => ({
					goalId: g.id,
					attainmentPct: 0,
					status: "IN_PROGRESS" as const,
					evidenceNotes: "",
				})),
		},
	};
}
