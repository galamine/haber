import type { CreateDepartmentDto, UpdateDepartmentDto } from '@haber/shared';
import { apiClient } from './client';

export interface DepartmentDto {
  id: string;
  tenantId: string;
  name: string;
  headUserId: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export const departmentsApi = {
  list: () => apiClient.get<DepartmentDto[]>('/v1/departments'),
  create: (data: CreateDepartmentDto) => apiClient.post<DepartmentDto>('/v1/departments', data),
  update: (id: string, data: UpdateDepartmentDto) => apiClient.patch<DepartmentDto>(`/v1/departments/${id}`, data),
  remove: (id: string) => apiClient.delete<void>(`/v1/departments/${id}`),
};
