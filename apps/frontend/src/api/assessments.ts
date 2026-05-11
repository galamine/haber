import type {
  AssessmentCreatedDto,
  AssessmentDto,
  AssessmentFunctionalConcernDto,
  AssessmentMilestoneDto,
  AssessmentSensoryRatingDto,
  CreateAssessmentDto,
  UpdateAssessmentDto,
  UpsertFunctionalConcernsDto,
  UpsertMilestonesDto,
  UpsertSensoryProfileDto,
} from '@haber/shared';
import { apiClient } from './client';

const BASE = (childId: string) => `/v1/children/${childId}/assessments`;
const SECTION = (childId: string, assessmentId: string) => `${BASE(childId)}/${assessmentId}`;

export type SensoryProfileResponse = { ratings: AssessmentSensoryRatingDto[]; sensoryObservations: string | null };
export type FunctionalConcernsResponse = {
  concerns: AssessmentFunctionalConcernDto[];
  functionalConcernObservations: string | null;
};

export const assessmentsApi = {
  create: (childId: string, data: CreateAssessmentDto) => apiClient.post<AssessmentCreatedDto>(BASE(childId), data),

  list: (childId: string) => apiClient.get<AssessmentDto[]>(BASE(childId)),

  get: (childId: string, assessmentId: string) => apiClient.get<AssessmentDto>(`${BASE(childId)}/${assessmentId}`),

  update: (childId: string, assessmentId: string, data: UpdateAssessmentDto) =>
    apiClient.patch<AssessmentDto>(`${BASE(childId)}/${assessmentId}`, data),

  finalise: (childId: string, assessmentId: string) =>
    apiClient.post<AssessmentDto>(`${BASE(childId)}/${assessmentId}/finalise`, {}),

  getMilestones: (childId: string, assessmentId: string) =>
    apiClient.get<AssessmentMilestoneDto[]>(`${SECTION(childId, assessmentId)}/milestones`),

  upsertMilestones: (childId: string, assessmentId: string, data: UpsertMilestonesDto) =>
    apiClient.put<AssessmentMilestoneDto[]>(`${SECTION(childId, assessmentId)}/milestones`, data),

  getSensoryProfile: (childId: string, assessmentId: string) =>
    apiClient.get<SensoryProfileResponse>(`${SECTION(childId, assessmentId)}/sensory-profile`),

  upsertSensoryProfile: (childId: string, assessmentId: string, data: UpsertSensoryProfileDto) =>
    apiClient.put<SensoryProfileResponse>(`${SECTION(childId, assessmentId)}/sensory-profile`, data),

  getFunctionalConcerns: (childId: string, assessmentId: string) =>
    apiClient.get<FunctionalConcernsResponse>(`${SECTION(childId, assessmentId)}/functional-concerns`),

  upsertFunctionalConcerns: (childId: string, assessmentId: string, data: UpsertFunctionalConcernsDto) =>
    apiClient.put<FunctionalConcernsResponse>(`${SECTION(childId, assessmentId)}/functional-concerns`, data),
};
