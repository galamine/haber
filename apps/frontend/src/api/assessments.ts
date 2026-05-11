import type { AssessmentCreatedDto, AssessmentDto, CreateAssessmentDto, UpdateAssessmentDto } from '@haber/shared';
import { apiClient } from './client';

const BASE = (childId: string) => `/v1/children/${childId}/assessments`;

export const assessmentsApi = {
  create: (childId: string, data: CreateAssessmentDto) => apiClient.post<AssessmentCreatedDto>(BASE(childId), data),

  list: (childId: string) => apiClient.get<AssessmentDto[]>(BASE(childId)),

  get: (childId: string, assessmentId: string) => apiClient.get<AssessmentDto>(`${BASE(childId)}/${assessmentId}`),

  update: (childId: string, assessmentId: string, data: UpdateAssessmentDto) =>
    apiClient.patch<AssessmentDto>(`${BASE(childId)}/${assessmentId}`, data),

  finalise: (childId: string, assessmentId: string) =>
    apiClient.post<AssessmentDto>(`${BASE(childId)}/${assessmentId}/finalise`, {}),
};
