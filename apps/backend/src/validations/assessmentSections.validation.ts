import { UpsertFunctionalConcernsDtoSchema, UpsertMilestonesDtoSchema, UpsertSensoryProfileDtoSchema } from '@haber/shared';
import { z } from 'zod';

const assessmentIdParam = z.object({
  childId: z.string().uuid('Invalid child ID'),
  assessmentId: z.string().uuid('Invalid assessment ID'),
});

export default {
  upsertMilestones: { params: assessmentIdParam, body: UpsertMilestonesDtoSchema },
  getMilestones: { params: assessmentIdParam },
  upsertSensoryProfile: { params: assessmentIdParam, body: UpsertSensoryProfileDtoSchema },
  getSensoryProfile: { params: assessmentIdParam },
  upsertFunctionalConcerns: { params: assessmentIdParam, body: UpsertFunctionalConcernsDtoSchema },
  getFunctionalConcerns: { params: assessmentIdParam },
};
