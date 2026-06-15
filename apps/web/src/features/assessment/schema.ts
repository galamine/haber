import {
	SectionASchema,
	SectionBSchema,
	SectionCSchema,
	SectionDSchema,
	SectionESchema,
	SectionFSchema,
	SectionGSchema,
	SectionHSchema,
} from "@haber-final/api/schemas/assessment";
import { z } from "zod";

export const PreviousTherapyRowSchema = z.object({
	therapyType: z.string(),
	durationFrequency: z.string(),
	providerLocation: z.string(),
});

export const SectionBFormSchema = SectionBSchema.omit({
	previousTherapies: true,
}).extend({
	previousTherapiesRows: z.array(PreviousTherapyRowSchema),
});

export const AssessmentFormSchema = z.object({
	sectionA: SectionASchema,
	sectionB: SectionBFormSchema,
	sectionC: SectionCSchema,
	sectionD: SectionDSchema,
	sectionE: SectionESchema,
	sectionF: SectionFSchema,
	sectionG: SectionGSchema,
	sectionH: SectionHSchema,
});

export type AssessmentFormValues = z.infer<typeof AssessmentFormSchema>;

export const EMPTY_DEFAULTS: AssessmentFormValues = {
	sectionA: {
		patientName: "",
		dob: "",
		age: { years: 0, months: 0 },
		gender: "",
		assessmentDate: "",
		location: "",
		referringTherapist: "",
		referralSource: "",
		caregiverName: "",
		caregiverRelation: "",
		caregiverContact: "",
		caregiverEmail: "",
		chiefComplaint: "",
	},
	sectionB: {
		primaryDiagnoses: [],
		prenatalHistory: "",
		birthHistory: "",
		neonatalHistory: "",
		gestationalAgeWeeks: undefined,
		medicalHistory: "",
		currentMedications: "",
		allergies: "",
		previousTherapiesRows: [],
	},
	sectionC: {
		milestones: [],
	},
	sectionD: {
		sensoryProfile: [],
		behaviouralObservations: "",
	},
	sectionE: {
		functionalConcerns: [],
		observations: "",
	},
	sectionF: {
		toolsAdministered: [],
		overallSummary: "",
	},
	sectionG: {
		shortTermGoals: [],
		longTermGoals: [],
		recommendedFrequency: 0,
		sessionDurationMinutes: 0,
		interventionSetting: "",
		reviewPeriodWeeks: 0,
		homeProgramRecommendations: "",
		equipment: [],
		referrals: "",
	},
	sectionH: {
		therapistName: "",
		guardianName: "",
		// RHF default must be an unchecked checkbox; zodResolver flags it
		// invalid until the user checks it.
		consentObtained: false as unknown as true,
	},
};

function computeAge(dob: Date): { years: number; months: number } {
	const now = new Date();
	let years = now.getFullYear() - dob.getFullYear();
	let months = now.getMonth() - dob.getMonth();
	if (now.getDate() < dob.getDate()) months--;
	if (months < 0) {
		years--;
		months += 12;
	}
	return { years, months };
}

export function buildDefaultValues({
	child,
	sensorySystems,
	milestones,
}: {
	child: { fullName: string; dob: string | Date; sex: string };
	sensorySystems: { id: string }[];
	milestones: { id: string }[];
}): AssessmentFormValues {
	const dob = new Date(child.dob);

	return {
		...EMPTY_DEFAULTS,
		sectionA: {
			...EMPTY_DEFAULTS.sectionA,
			patientName: child.fullName,
			dob: dob.toISOString().slice(0, 10),
			age: computeAge(dob),
			gender: child.sex,
		},
		sectionC: {
			milestones: milestones.map((m) => ({
				milestoneId: m.id,
				achievedAtAgeMonths: undefined,
				delayed: false,
				notes: "",
			})),
		},
		sectionD: {
			...EMPTY_DEFAULTS.sectionD,
			sensoryProfile: sensorySystems.map((s) => ({
				systemId: s.id,
				rating: 3,
				notes: "",
			})),
		},
	};
}
