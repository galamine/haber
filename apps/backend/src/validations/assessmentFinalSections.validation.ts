import {
  FinaliseAssessmentDtoSchema,
  SignDtoSchema,
  UpsertInterventionPlanDtoSchema,
  UpsertToolResultsDtoSchema,
} from '@haber/shared';
import { z } from 'zod';

const assessmentIdParam = z.object({
  childId: z.string().uuid('Invalid child ID'),
  assessmentId: z.string().uuid('Invalid assessment ID'),
});

export default {
  upsertToolResults: { params: assessmentIdParam, body: UpsertToolResultsDtoSchema },
  getToolResults: { params: assessmentIdParam },
  upsertInterventionPlan: { params: assessmentIdParam, body: UpsertInterventionPlanDtoSchema },
  getInterventionPlan: { params: assessmentIdParam },
  sign: { params: assessmentIdParam, body: SignDtoSchema },
  getSignatures: { params: assessmentIdParam },
  finalise: { params: assessmentIdParam, body: FinaliseAssessmentDtoSchema },
};
