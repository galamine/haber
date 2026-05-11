import type {
  CreateChildDto,
  CreateGuardianDto,
  UpdateChildDto,
  UpdateGuardianDto,
  UpsertMedicalHistoryDto,
} from '@haber/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GetChildrenParams } from '@/api/children';
import { childrenApi } from '@/api/children';

export const childrenKeys = {
  all: ['children'] as const,
  list: (params?: object) => [...childrenKeys.all, 'list', params] as const,
  detail: (id: string) => [...childrenKeys.all, 'detail', id] as const,
  intakeStatus: (id: string) => [...childrenKeys.all, 'intake-status', id] as const,
};

export function useChildren(params?: GetChildrenParams) {
  return useQuery({
    queryKey: childrenKeys.list(params),
    queryFn: () => childrenApi.getChildren(params),
  });
}

export function useChild(childId: string) {
  return useQuery({
    queryKey: childrenKeys.detail(childId),
    queryFn: () => childrenApi.getChildById(childId),
    enabled: !!childId,
  });
}

export function useIntakeStatus(childId: string) {
  return useQuery({
    queryKey: childrenKeys.intakeStatus(childId),
    queryFn: () => childrenApi.getIntakeStatus(childId),
    enabled: !!childId,
  });
}

export function useCreateChild() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateChildDto) => childrenApi.createChild(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: childrenKeys.all });
    },
  });
}

export function useUpdateChild() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ childId, data }: { childId: string; data: UpdateChildDto }) => childrenApi.updateChild(childId, data),
    onSuccess: (data) => {
      queryClient.setQueryData(childrenKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: childrenKeys.all });
    },
  });
}

export function useUpsertMedicalHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ childId, data }: { childId: string; data: UpsertMedicalHistoryDto }) =>
      childrenApi.upsertMedicalHistory(childId, data),
    onSuccess: (_, { childId }) => {
      queryClient.invalidateQueries({ queryKey: childrenKeys.detail(childId) });
      queryClient.invalidateQueries({ queryKey: childrenKeys.intakeStatus(childId) });
    },
  });
}

export function useCreateGuardian() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ childId, data }: { childId: string; data: CreateGuardianDto }) =>
      childrenApi.createGuardian(childId, data),
    onSuccess: (_, { childId }) => {
      queryClient.invalidateQueries({ queryKey: childrenKeys.detail(childId) });
      queryClient.invalidateQueries({ queryKey: childrenKeys.intakeStatus(childId) });
    },
  });
}

export function useUpdateGuardian() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ childId, guardianId, data }: { childId: string; guardianId: string; data: UpdateGuardianDto }) =>
      childrenApi.updateGuardian(childId, guardianId, data),
    onSuccess: (_, { childId }) => {
      queryClient.invalidateQueries({ queryKey: childrenKeys.detail(childId) });
    },
  });
}

export function useSoftDeleteChild() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (childId: string) => childrenApi.softDeleteChild(childId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: childrenKeys.all });
    },
  });
}
