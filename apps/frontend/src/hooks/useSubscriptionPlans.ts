import type { UpdateSubscriptionPlanDto } from '@haber/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GetSubscriptionPlansParams } from '@/api/subscriptionPlans';
import { subscriptionPlansApi } from '@/api/subscriptionPlans';

export const planKeys = {
  all: ['subscriptionPlans'] as const,
  list: (params?: object) => [...planKeys.all, 'list', params] as const,
  detail: (id: string) => [...planKeys.all, 'detail', id] as const,
};

export function useSubscriptionPlans(params?: GetSubscriptionPlansParams) {
  return useQuery({
    queryKey: planKeys.list(params),
    queryFn: () => subscriptionPlansApi.getPlans(params),
  });
}

export function useSubscriptionPlan(planId: string) {
  return useQuery({
    queryKey: planKeys.detail(planId),
    queryFn: () => subscriptionPlansApi.getPlan(planId),
    enabled: !!planId,
  });
}

export function useCreateSubscriptionPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: subscriptionPlansApi.createPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.all });
    },
  });
}

export function useUpdateSubscriptionPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSubscriptionPlanDto }) => subscriptionPlansApi.updatePlan(id, data),
    onSuccess: (data) => {
      queryClient.setQueryData(planKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: planKeys.all });
    },
  });
}
