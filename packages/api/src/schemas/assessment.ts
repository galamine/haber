import { z } from "zod";

export const MilestoneEntrySchema = z.object({
	milestoneId: z.string(),
	achievedAtAgeMonths: z.number().int().optional(),
	delayed: z.boolean(),
	notes: z.string(),
});

export const SensoryRatingSchema = z.object({
	systemId: z.string(),
	rating: z.number().int().min(1).max(5),
	notes: z.string(),
});

export const ToolEntrySchema = z.object({
	toolId: z.string(),
	scoresSummary: z.string(),
});

export const GoalTemplateSchema = z.object({
	goalId: z.string(),
	description: z.string().min(1, "Goal description is required"),
	targetAttainmentPct: z.number().min(0).max(100),
});

export const SectionASchema = z.object({
	patientName: z.string().min(1, "Patient name is required"),
	dob: z.string().min(1, "Date of birth is required"),
	age: z.object({
		years: z.number().int().min(0),
		months: z.number().int().min(0).max(11),
	}),
	gender: z.enum(["Male", "Female", "Other", "Prefer not to say"], {
		message: "Gender is required",
	}),
	assessmentDate: z.string().min(1, "Assessment date is required"),
	location: z.string().min(1, "Assessment location is required"),
	referringTherapist: z
		.string()
		.min(1, "Referring therapist/doctor is required"),
	referralSource: z.string().min(1, "Referral source is required"),
	caregiverName: z.string().min(1, "Caregiver name is required"),
	caregiverRelation: z.string().min(1, "Relationship to child is required"),
	caregiverContact: z
		.string()
		.min(1, "Contact number is required")
		.regex(/^[+\d][+\d\s\-()]*$/, "Invalid contact number format"),
	caregiverEmail: z
		.string()
		.min(1, "Email is required")
		.email("Invalid email address"),
	chiefComplaint: z.string().min(1, "Chief complaint is required"),
});

export const SectionBSchema = z.object({
	primaryDiagnoses: z.array(z.string()),
	prenatalHistory: z.string().min(1, "Prenatal history is required"),
	birthHistory: z.string().min(1, "Birth history is required"),
	neonatalHistory: z.string().min(1, "Neonatal history is required"),
	gestationalAgeWeeks: z.number().int().optional(),
	medicalHistory: z.string().min(1, "Medical history is required"),
	currentMedications: z.string().min(1, "Current medications is required"),
	allergies: z.string().min(1, "Allergies is required"),
	previousTherapies: z.string(),
});

export const SectionCSchema = z.object({
	milestones: z.array(MilestoneEntrySchema).min(1),
});

export const SectionDSchema = z.object({
	sensoryProfile: z.array(SensoryRatingSchema).length(7),
	behaviouralObservations: z
		.string()
		.min(1, "Behavioural observations are required"),
});

export const SectionESchema = z.object({
	functionalConcerns: z.array(z.string()),
	observations: z.string().min(1, "Clinical observations are required"),
});

export const SectionFSchema = z.object({
	toolsAdministered: z.array(ToolEntrySchema),
	overallSummary: z.string().min(1, "Overall summary is required"),
});

export const SectionGSchema = z.object({
	shortTermGoals: z
		.array(GoalTemplateSchema)
		.min(1, "At least one short-term goal is required"),
	longTermGoals: z
		.array(GoalTemplateSchema)
		.min(1, "At least one long-term goal is required"),
	recommendedFrequency: z.number().min(1, "Recommended frequency is required"),
	sessionDurationMinutes: z.number().min(1, "Session duration is required"),
	interventionSetting: z.string().min(1, "Intervention setting is required"),
	reviewPeriodWeeks: z.number().min(1, "Review period is required"),
	homeProgramRecommendations: z
		.string()
		.min(1, "Home program recommendations are required"),
	equipment: z.array(z.string()),
	referrals: z.string().min(1, "Referrals field is required"),
});

export const SectionHSchema = z.object({
	therapistName: z.string().min(1, "Therapist name is required"),
	signedAt: z.string(),
	therapistCredentials: z.string().optional(),
	therapistIp: z.string().optional(),
	guardianName: z.string().min(1, "Guardian name is required"),
	guardianIp: z.string().optional(),
	consentObtained: z.literal(true, "Consent must be obtained to submit"),
});

export const CreateAssessmentInput = z.object({
	childId: z.string(),
	sectionA: SectionASchema,
	sectionB: SectionBSchema,
	sectionC: SectionCSchema,
	sectionD: SectionDSchema,
	sectionE: SectionESchema,
	sectionF: SectionFSchema,
	sectionG: SectionGSchema,
	sectionH: SectionHSchema,
});

export const InitialAssessmentSchema = z.object({
	id: z.string(),
	childId: z.string(),
	therapistId: z.string(),
	versionNumber: z.number().int(),
	sectionA: SectionASchema,
	sectionB: SectionBSchema,
	sectionC: SectionCSchema,
	sectionD: SectionDSchema,
	sectionE: SectionESchema,
	sectionF: SectionFSchema,
	sectionG: SectionGSchema,
	sectionH: SectionHSchema,
	createdAt: z.date(),
});
