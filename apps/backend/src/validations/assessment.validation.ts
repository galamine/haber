import { CreateAssessmentDtoSchema, UpdateAssessmentDtoSchema } from '@haber/shared';
import { z } from 'zod';

const childIdParam = z.object({ childId: z.string().uuid('Invalid child ID') });
const assessmentIdParam = z.object({
  childId: z.string().uuid('Invalid child ID'),
  assessmentId: z.string().uuid('Invalid assessment ID'),
});

export default {
  create: { params: childIdParam, body: CreateAssessmentDtoSchema },
  list: { params: childIdParam },
  get: { params: assessmentIdParam },
  update: { params: assessmentIdParam, body: UpdateAssessmentDtoSchema },
  finalise: { params: assessmentIdParam },
};
