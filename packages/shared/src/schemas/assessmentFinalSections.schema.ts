import { z } from 'zod';

export const InterventionSettingEnum = z.enum(['clinic', 'home', 'school', 'early_intervention', 'rehab', 'hybrid']);
export type InterventionSetting = z.infer<typeof InterventionSettingEnum>;

export const SignatoryTypeEnum = z.enum(['therapist', 'guardian']);
export type SignatoryType = z.infer<typeof SignatoryTypeEnum>;

export const GoalSchema = z.object({
  description: z.string().min(1),
});
export type Goal = z.infer<typeof GoalSchema>;

export const ToolResultInputSchema = z.object({
  assessmentToolId: z.string().uuid(),
  scoresSummary: z.string().nullable().optional(),
});

export const UpsertToolResultsDtoSchema = z.object({
  toolResults: z.array(ToolResultInputSchema),
  overallScoresSummary: z.string().nullable().optional(),
});

export const AssessmentToolResultDtoSchema = z.object({
  id: z.string().uuid(),
  assessmentId: z.string().uuid(),
  assessmentToolId: z.string().uuid(),
  scoresSummary: z.string().nullable(),
  createdAt: z.string(),
});

export const UpsertInterventionPlanDtoSchema = z.object({
  frequencyPerWeek: z.number().int().min(1),
  sessionDurationMinutes: z.number().int().min(1),
  interventionSetting: InterventionSettingEnum,
  reviewPeriodWeeks: z.number().int().min(1),
  homeProgramRecommendations: z.string().nullable().optional(),
  referralsToSpecialists: z.string().nullable().optional(),
  shortTermGoals: z.array(GoalSchema).max(4),
  longTermGoals: z.array(GoalSchema).max(4),
});

export const AssessmentInterventionPlanDtoSchema = z.object({
  id: z.string().uuid(),
  assessmentId: z.string().uuid(),
  frequencyPerWeek: z.number().int(),
  sessionDurationMinutes: z.number().int(),
  interventionSetting: InterventionSettingEnum,
  reviewPeriodWeeks: z.number().int(),
  homeProgramRecommendations: z.string().nullable(),
  referralsToSpecialists: z.string().nullable(),
  shortTermGoals: z.array(GoalSchema),
  longTermGoals: z.array(GoalSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const SignDtoSchema = z.object({
  signatoryType: SignatoryTypeEnum,
  typedName: z.string().min(1),
  credentials: z.string().nullable().optional(),
  consentCheckbox: z.boolean().nullable().optional(),
});

export const AssessmentSignatureDtoSchema = z.object({
  id: z.string().uuid(),
  assessmentId: z.string().uuid(),
  signatoryType: SignatoryTypeEnum,
  typedName: z.string(),
  credentials: z.string().nullable(),
  timestamp: z.string(),
  ipAddress: z.string(),
  consentCheckbox: z.boolean().nullable(),
  createdAt: z.string(),
});

export const FinaliseAssessmentDtoSchema = z.object({});

export type ToolResultInput = z.infer<typeof ToolResultInputSchema>;
export type UpsertToolResultsDto = z.infer<typeof UpsertToolResultsDtoSchema>;
export type AssessmentToolResultDto = z.infer<typeof AssessmentToolResultDtoSchema>;
export type UpsertInterventionPlanDto = z.infer<typeof UpsertInterventionPlanDtoSchema>;
export type AssessmentInterventionPlanDto = z.infer<typeof AssessmentInterventionPlanDtoSchema>;
export type SignDto = z.infer<typeof SignDtoSchema>;
export type AssessmentSignatureDto = z.infer<typeof AssessmentSignatureDtoSchema>;
export type FinaliseAssessmentDto = z.infer<typeof FinaliseAssessmentDtoSchema>;
