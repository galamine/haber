import type { CreateSensoryRoomDto, UpdateSensoryRoomDto } from '@haber/shared';
import { apiClient } from './client';

export interface SensoryRoomDto {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  departmentId: string | null;
  equipmentList: string[];
  status: 'active' | 'maintenance';
  createdAt: string;
  updatedAt: string;
}

export const sensoryRoomsApi = {
  list: (status?: 'active' | 'maintenance') => {
    const query = status ? `?status=${status}` : '';
    return apiClient.get<SensoryRoomDto[]>(`/v1/sensory-rooms${query}`);
  },
  getOne: (id: string) => apiClient.get<SensoryRoomDto>(`/v1/sensory-rooms/${id}`),
  create: (data: CreateSensoryRoomDto) => apiClient.post<SensoryRoomDto>('/v1/sensory-rooms', data),
  update: (id: string, data: UpdateSensoryRoomDto) => apiClient.patch<SensoryRoomDto>(`/v1/sensory-rooms/${id}`, data),
  remove: (id: string) => apiClient.delete<void>(`/v1/sensory-rooms/${id}`),
};
