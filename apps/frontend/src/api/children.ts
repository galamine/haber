import type {
  ChildDto,
  CreateChildDto,
  CreateGuardianDto,
  GuardianDto,
  IntakeStatusDto,
  MedicalHistoryDto,
  PaginatedChildDto,
  UpdateChildDto,
  UpdateGuardianDto,
  UpsertMedicalHistoryDto,
} from '@haber/shared';
import { apiClient } from './client';

export interface GetChildrenParams {
  name?: string;
  opNumber?: string;
  includeDeleted?: boolean;
  sortBy?: string;
  limit?: number;
  page?: number;
}

function buildQuery(params?: GetChildrenParams): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) searchParams.append(key, String(value));
  }
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export const childrenApi = {
  getChildren: (params?: GetChildrenParams) => apiClient.get<PaginatedChildDto>(`/v1/children${buildQuery(params)}`),

  getChildById: (childId: string) => apiClient.get<ChildDto>(`/v1/children/${childId}`),

  createChild: (data: CreateChildDto) => apiClient.post<ChildDto>('/v1/children', data),

  updateChild: (childId: string, data: UpdateChildDto) => apiClient.patch<ChildDto>(`/v1/children/${childId}`, data),

  upsertMedicalHistory: (childId: string, data: UpsertMedicalHistoryDto) =>
    apiClient.put<MedicalHistoryDto>(`/v1/children/${childId}/medical-history`, data),

  createGuardian: (childId: string, data: CreateGuardianDto) =>
    apiClient.post<GuardianDto>(`/v1/children/${childId}/guardians`, data),

  updateGuardian: (childId: string, guardianId: string, data: UpdateGuardianDto) =>
    apiClient.patch<GuardianDto>(`/v1/children/${childId}/guardians/${guardianId}`, data),

  getIntakeStatus: (childId: string) => apiClient.get<IntakeStatusDto>(`/v1/children/${childId}/intake-status`),

  softDeleteChild: (childId: string) => apiClient.delete<void>(`/v1/children/${childId}`),
};
