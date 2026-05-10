import type { ClinicDto, CreateClinicDto, PaginatedClinicsDto, UpdateClinicDto } from '@haber/shared';
import { apiClient } from './client';

export interface GetClinicsParams {
  name?: string;
  status?: 'active' | 'suspended';
  sortBy?: string;
  limit?: number;
  page?: number;
}

export const clinicsApi = {
  getClinics: (params?: GetClinicsParams) => {
    const searchParams = new URLSearchParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) searchParams.append(key, String(value));
      }
    }
    const query = searchParams.toString();
    return apiClient.get<PaginatedClinicsDto>(`/v1/super-admin/clinics${query ? `?${query}` : ''}`);
  },

  getClinic: (id: string) => apiClient.get<ClinicDto>(`/v1/super-admin/clinics/${id}`),

  createClinic: (data: CreateClinicDto) => apiClient.post<ClinicDto>('/v1/super-admin/clinics', data),

  updateClinic: (id: string, data: UpdateClinicDto) => apiClient.patch<ClinicDto>(`/v1/super-admin/clinics/${id}`, data),

  suspendClinic: (id: string) => apiClient.post<ClinicDto>(`/v1/super-admin/clinics/${id}/suspend`, {}),

  reactivateClinic: (id: string) => apiClient.post<ClinicDto>(`/v1/super-admin/clinics/${id}/reactivate`, {}),

  getMyClinic: () => apiClient.get<ClinicDto>('/v1/clinic/me'),
};
