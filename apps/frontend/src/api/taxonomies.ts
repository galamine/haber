import type {
  AssessmentToolDto,
  CreateAssessmentToolDto,
  CreateDiagnosisDto,
  CreateEquipmentDto,
  CreateFunctionalConcernDto,
  CreateInterventionApproachDto,
  CreateMilestoneDto,
  CreateSensorySystemDto,
  DiagnosisDto,
  EquipmentDto,
  FunctionalConcernDto,
  InterventionApproachDto,
  MilestoneDto,
  SensorySystemDto,
  TaxonomyType,
} from '@haber/shared/dtos';
import { apiClient } from './client';

export type TaxonomyItemDto =
  | DiagnosisDto
  | MilestoneDto
  | SensorySystemDto
  | FunctionalConcernDto
  | AssessmentToolDto
  | EquipmentDto
  | InterventionApproachDto;

export type CreateTaxonomyDto =
  | CreateDiagnosisDto
  | CreateMilestoneDto
  | CreateSensorySystemDto
  | CreateFunctionalConcernDto
  | CreateAssessmentToolDto
  | CreateEquipmentDto
  | CreateInterventionApproachDto;

export const taxonomiesApi = {
  list: (type: TaxonomyType) => apiClient.get<{ data: TaxonomyItemDto[] }>(`/v1/taxonomies/${type}`),

  create: (type: TaxonomyType, data: CreateTaxonomyDto) => apiClient.post<TaxonomyItemDto>(`/v1/taxonomies/${type}`, data),

  remove: (type: TaxonomyType, id: string) => apiClient.delete<void>(`/v1/taxonomies/${type}/${id}`),
};
