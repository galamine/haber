import { z } from 'zod';

export const MilestoneRatingInputSchema = z.object({
  milestoneId: z.string().uuid(),
  achievedAtAgeMonths: z.number().int().min(0).nullable(),
  delayed: z.boolean(),
  notes: z.string().nullable().optional(),
});

export const UpsertMilestonesDtoSchema = z.object({
  milestones: z.array(MilestoneRatingInputSchema),
});

export const AssessmentMilestoneDtoSchema = z.object({
  id: z.string().uuid(),
  assessmentId: z.string().uuid(),
  milestoneId: z.string().uuid(),
  achievedAtAgeMonths: z.number().int().nullable(),
  delayed: z.boolean(),
  notes: z.string().nullable(),
  createdAt: z.string(),
});

export const SensoryRatingInputSchema = z.object({
  sensorySystemId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  notes: z.string().nullable().optional(),
});

export const UpsertSensoryProfileDtoSchema = z.object({
  ratings: z.array(SensoryRatingInputSchema),
  sensoryObservations: z.string().nullable().optional(),
});

export const AssessmentSensoryRatingDtoSchema = z.object({
  id: z.string().uuid(),
  assessmentId: z.string().uuid(),
  sensorySystemId: z.string().uuid(),
  rating: z.number().int(),
  notes: z.string().nullable(),
  createdAt: z.string(),
});

export const UpsertFunctionalConcernsDtoSchema = z.object({
  functionalConcernIds: z.array(z.string().uuid()),
  clinicalObservations: z.string().nullable().optional(),
});

export const AssessmentFunctionalConcernDtoSchema = z.object({
  assessmentId: z.string().uuid(),
  functionalConcernId: z.string().uuid(),
});

export type MilestoneRatingInput = z.infer<typeof MilestoneRatingInputSchema>;
export type UpsertMilestonesDto = z.infer<typeof UpsertMilestonesDtoSchema>;
export type AssessmentMilestoneDto = z.infer<typeof AssessmentMilestoneDtoSchema>;
export type SensoryRatingInput = z.infer<typeof SensoryRatingInputSchema>;
export type UpsertSensoryProfileDto = z.infer<typeof UpsertSensoryProfileDtoSchema>;
export type AssessmentSensoryRatingDto = z.infer<typeof AssessmentSensoryRatingDtoSchema>;
export type UpsertFunctionalConcernsDto = z.infer<typeof UpsertFunctionalConcernsDtoSchema>;
export type AssessmentFunctionalConcernDto = z.infer<typeof AssessmentFunctionalConcernDtoSchema>;
