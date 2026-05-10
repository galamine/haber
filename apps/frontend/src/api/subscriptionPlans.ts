import type {
  CreateSubscriptionPlanDto,
  PaginatedSubscriptionPlansDto,
  SubscriptionPlanDto,
  UpdateSubscriptionPlanDto,
} from '@haber/shared';
import { apiClient } from './client';

export interface GetSubscriptionPlansParams {
  name?: string;
  tier?: 'basic' | 'advanced' | 'enterprise';
  sortBy?: string;
  limit?: number;
  page?: number;
}

export const subscriptionPlansApi = {
  getPlans: (params?: GetSubscriptionPlansParams) => {
    const searchParams = new URLSearchParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) searchParams.append(key, String(value));
      }
    }
    const query = searchParams.toString();
    return apiClient.get<PaginatedSubscriptionPlansDto>(`/v1/super-admin/subscription-plans${query ? `?${query}` : ''}`);
  },

  getPlan: (id: string) => apiClient.get<SubscriptionPlanDto>(`/v1/super-admin/subscription-plans/${id}`),

  createPlan: (data: CreateSubscriptionPlanDto) =>
    apiClient.post<SubscriptionPlanDto>('/v1/super-admin/subscription-plans', data),

  updatePlan: (id: string, data: UpdateSubscriptionPlanDto) =>
    apiClient.patch<SubscriptionPlanDto>(`/v1/super-admin/subscription-plans/${id}`, data),
};
