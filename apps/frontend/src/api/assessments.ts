import type {
  AssessmentCreatedDto,
  AssessmentDto,
  AssessmentFunctionalConcernDto,
  AssessmentInterventionPlanDto,
  AssessmentMilestoneDto,
  AssessmentSensoryRatingDto,
  AssessmentSignatureDto,
  AssessmentToolResultDto,
  CreateAssessmentDto,
  FinaliseAssessmentDto,
  SignDto,
  UpdateAssessmentDto,
  UpsertFunctionalConcernsDto,
  UpsertInterventionPlanDto,
  UpsertMilestonesDto,
  UpsertSensoryProfileDto,
  UpsertToolResultsDto,
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

  finalise: (childId: string, assessmentId: string, data: FinaliseAssessmentDto) =>
    apiClient.post<AssessmentDto>(`${BASE(childId)}/${assessmentId}/finalise`, data),

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

  getToolResults: (childId: string, assessmentId: string) =>
    apiClient.get<AssessmentToolResultDto[]>(`${SECTION(childId, assessmentId)}/tool-results`),

  upsertToolResults: (childId: string, assessmentId: string, data: UpsertToolResultsDto) =>
    apiClient.put<AssessmentToolResultDto[]>(`${SECTION(childId, assessmentId)}/tool-results`, data),

  getInterventionPlan: (childId: string, assessmentId: string) =>
    apiClient.get<AssessmentInterventionPlanDto>(`${SECTION(childId, assessmentId)}/intervention-plan`),

  upsertInterventionPlan: (childId: string, assessmentId: string, data: UpsertInterventionPlanDto) =>
    apiClient.put<AssessmentInterventionPlanDto>(`${SECTION(childId, assessmentId)}/intervention-plan`, data),

  getSignatures: (childId: string, assessmentId: string) =>
    apiClient.get<AssessmentSignatureDto[]>(`${SECTION(childId, assessmentId)}/signatures`),

  sign: (childId: string, assessmentId: string, data: SignDto) =>
    apiClient.post<AssessmentSignatureDto>(`${SECTION(childId, assessmentId)}/sign`, data),
};
