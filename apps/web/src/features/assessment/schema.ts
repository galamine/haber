import {
	SectionASchema,
	SectionBSchema,
	SectionCSchema,
	SectionDSchema,
	SectionESchema,
	SectionHSchema,
} from "@haber-final/api/schemas/assessment";
import { z } from "zod";

export const AssessmentFormSchema = z.object({
	sectionA: SectionASchema,
	sectionB: SectionBSchema,
	sectionC: SectionCSchema,
	sectionD: SectionDSchema,
	sectionE: SectionESchema,
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
		referringTherapist: "",
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
	},
	sectionC: {
		milestones: [],
	},
	sectionD: {
		sensoryProfile: [
			{ systemId: "", rating: 3, notes: "" },
			{ systemId: "", rating: 3, notes: "" },
			{ systemId: "", rating: 3, notes: "" },
			{ systemId: "", rating: 3, notes: "" },
			{ systemId: "", rating: 3, notes: "" },
			{ systemId: "", rating: 3, notes: "" },
			{ systemId: "", rating: 3, notes: "" },
		],
		behaviouralObservations: [],
	},
	sectionE: {
		functionalConcerns: [],
		observations: [],
	},
	sectionH: {
		therapistName: "",
		signedAt: "",
		guardianName: "",
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
	child: {
		fullName: string;
		dob: string | Date;
		sex: string;
		guardian?: {
			name: string;
			relation: string;
			phone: string;
			email: string | null;
		} | null;
	};
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
			caregiverName: child.guardian?.name ?? "",
			caregiverRelation: child.guardian?.relation ?? "",
			caregiverContact: child.guardian?.phone ?? "",
			caregiverEmail: child.guardian?.email ?? "",
		},
		sectionC: {
			milestones:
				milestones.length > 0
					? milestones.map((m) => ({
							milestoneId: m.id,
							achievedAtAgeMonths: undefined,
							delayed: false,
							notes: "",
						}))
					: EMPTY_DEFAULTS.sectionC.milestones,
		},
		sectionD: {
			...EMPTY_DEFAULTS.sectionD,
			sensoryProfile:
				sensorySystems.length >= 7
					? sensorySystems.map((s) => ({
							systemId: s.id,
							rating: 3,
							notes: "",
						}))
					: EMPTY_DEFAULTS.sectionD.sensoryProfile,
		},
		sectionH: {
			...EMPTY_DEFAULTS.sectionH,
			guardianName: child.guardian?.name ?? "",
		},
	};
}
