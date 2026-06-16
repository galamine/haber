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
	description: z.string(),
	targetAttainmentPct: z.number(),
});

export const SectionASchema = z.object({
	patientName: z.string(),
	dob: z.string(),
	age: z.object({
		years: z.number().int(),
		months: z.number().int(),
	}),
	gender: z.string(),
	assessmentDate: z.string(),
	location: z.string(),
	referringTherapist: z.string(),
	referralSource: z.string(),
	caregiverName: z.string(),
	caregiverRelation: z.string(),
	caregiverContact: z.string(),
	caregiverEmail: z.string().email(),
	chiefComplaint: z.string(),
});

export const SectionBSchema = z.object({
	primaryDiagnoses: z.array(z.string()),
	prenatalHistory: z.string(),
	birthHistory: z.string(),
	neonatalHistory: z.string(),
	gestationalAgeWeeks: z.number().int().optional(),
	medicalHistory: z.string(),
	currentMedications: z.string(),
	allergies: z.string(),
	previousTherapies: z.string(),
});

export const SectionCSchema = z.object({
	milestones: z.array(MilestoneEntrySchema).min(1),
});

export const SectionDSchema = z.object({
	sensoryProfile: z.array(SensoryRatingSchema).length(7),
	behaviouralObservations: z.string(),
});

export const SectionESchema = z.object({
	functionalConcerns: z.array(z.string()),
	observations: z.string(),
});

export const SectionFSchema = z.object({
	toolsAdministered: z.array(ToolEntrySchema),
	overallSummary: z.string(),
});

export const SectionGSchema = z.object({
	shortTermGoals: z.array(GoalTemplateSchema),
	longTermGoals: z.array(GoalTemplateSchema),
	recommendedFrequency: z.number(),
	sessionDurationMinutes: z.number(),
	interventionSetting: z.string(),
	reviewPeriodWeeks: z.number(),
	homeProgramRecommendations: z.string(),
	equipment: z.array(z.string()),
	referrals: z.string(),
});

export const SectionHSchema = z.object({
	therapistName: z.string(),
	therapistCredentials: z.string().optional(),
	therapistIp: z.string().optional(),
	guardianName: z.string(),
	guardianIp: z.string().optional(),
	consentObtained: z.literal(true),
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

export const GoalStatusSchema = z.enum([
	"MET",
	"IN_PROGRESS",
	"NOT_MET",
	"DISCONTINUED",
]);

export const GoalProgressInputSchema = z.object({
	goalId: z.string(),
	attainmentPct: z.number().int().min(0).max(100),
	status: GoalStatusSchema,
	evidenceNotes: z.string(),
});

export const SensoryCheckInputSchema = SensoryRatingSchema;

export const SensoryCheckResultSchema = SensoryCheckInputSchema.extend({
	baseline: z.number().int(),
	change: z.number().int(),
});

export const FollowUpSectionASchema = z.object({
	date: z.string(),
	therapistId: z.string(),
	sessionNumber: z.number().int(),
	weeksSinceInitial: z.number().int(),
	parentPresent: z.boolean(),
});

export const FollowUpSectionBSchema = z.object({
	goalProgress: z.array(GoalProgressInputSchema).min(1),
});

export const FollowUpSectionCSchema = z.object({
	sensoryCheck: z.array(SensoryCheckInputSchema).length(7),
});

export const FollowUpSectionDSchema = z.object({
	improvementsAtHome: z.string(),
	improvementsAtSchool: z.string(),
	regressions: z.string().optional(),
	homeProgramCompliance: z.string(),
	sessionEngagement: z.string(),
	schoolPerformanceChanges: z.string(),
	behaviourChanges: z.string(),
	newSkillsObserved: z.string(),
	equipmentEffectivelyUsed: z.string(),
	therapistObservations: z.string(),
});

export const FollowUpSectionESchema = z.object({
	goalStatusDecisions: z.array(z.string()),
	updatedGoals: z.array(GoalTemplateSchema),
	updatedHomeProgram: z.string(),
	nextFollowUpDate: z.string(),
	nextAssessmentType: z.string(),
	clinicalNotes: z.string(),
});

export const FollowUpSectionFSchema = z.object({
	therapistName: z.string(),
	therapistCredentials: z.string().optional(),
	therapistIp: z.string().optional(),
	guardianName: z.string(),
	guardianIp: z.string().optional(),
});

export const CreateFollowUpInput = z.object({
	childId: z.string(),
	initialAssessmentId: z.string(),
	treatmentPlanId: z.string(),
	previousFollowUpId: z.string().optional(),
	sectionA: FollowUpSectionASchema,
	sectionB: FollowUpSectionBSchema,
	sectionC: FollowUpSectionCSchema,
	sectionD: FollowUpSectionDSchema,
	sectionE: FollowUpSectionESchema,
	sectionF: FollowUpSectionFSchema,
});

export const SensoryDeltaSchema = z.object({
	system: z.string(),
	baseline: z.number().int(),
	current: z.number().int(),
	change: z.number().int(),
});

export const FollowUpAssessmentSchema = z.object({
	id: z.string(),
	childId: z.string(),
	initialAssessmentId: z.string(),
	treatmentPlanId: z.string(),
	previousFollowUpId: z.string().nullable(),
	therapistId: z.string(),
	versionNumber: z.number().int(),
	sectionA: FollowUpSectionASchema,
	sectionB: FollowUpSectionBSchema,
	sectionC: z.object({ sensoryCheck: z.array(SensoryCheckResultSchema) }),
	sectionD: FollowUpSectionDSchema,
	sectionE: FollowUpSectionESchema,
	sectionF: FollowUpSectionFSchema,
	createdAt: z.date(),
});
