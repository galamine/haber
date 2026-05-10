import type { InviteStaffDto, PaginatedStaffDto, StaffDto, UpdateStaffDto } from '@haber/shared';
import { apiClient } from './client';

export interface GetStaffParams {
  name?: string;
  role?: 'therapist' | 'staff';
  isActive?: boolean;
  sortBy?: string;
  limit?: number;
  page?: number;
}

export interface CapacityEntry {
  role: string;
  active: number;
  total: number;
  limit: number | null;
}

export const staffApi = {
  inviteStaff: (data: InviteStaffDto) => apiClient.post<void>('/v1/staff/invite', data),

  getStaff: (params?: GetStaffParams) => {
    const searchParams = new URLSearchParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) searchParams.append(key, String(value));
      }
    }
    const query = searchParams.toString();
    return apiClient.get<PaginatedStaffDto>(`/v1/staff${query ? `?${query}` : ''}`);
  },

  getCapacity: () => apiClient.get<CapacityEntry[]>('/v1/staff/capacity'),

  getStaffById: (userId: string) => apiClient.get<StaffDto>(`/v1/staff/${userId}`),

  updateStaff: (userId: string, data: UpdateStaffDto) => apiClient.patch<StaffDto>(`/v1/staff/${userId}`, data),

  deactivateStaff: (userId: string) => apiClient.post<void>(`/v1/staff/${userId}/deactivate`, undefined),

  reactivateStaff: (userId: string) => apiClient.post<StaffDto>(`/v1/staff/${userId}/reactivate`, undefined),
};
