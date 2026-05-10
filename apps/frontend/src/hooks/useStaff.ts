import type { UpdateStaffDto } from '@haber/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GetStaffParams } from '@/api/staff';
import { staffApi } from '@/api/staff';

export const staffKeys = {
  all: ['staff'] as const,
  list: (params?: object) => [...staffKeys.all, 'list', params] as const,
  detail: (id: string) => [...staffKeys.all, 'detail', id] as const,
  capacity: ['staff', 'capacity'] as const,
};

export function useStaff(params?: GetStaffParams) {
  return useQuery({
    queryKey: staffKeys.list(params),
    queryFn: () => staffApi.getStaff(params),
  });
}

export function useStaffMember(userId: string) {
  return useQuery({
    queryKey: staffKeys.detail(userId),
    queryFn: () => staffApi.getStaffById(userId),
    enabled: !!userId,
  });
}

export function useStaffCapacity() {
  return useQuery({
    queryKey: staffKeys.capacity,
    queryFn: staffApi.getCapacity,
  });
}

export function useInviteStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: staffApi.inviteStaff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all });
      queryClient.invalidateQueries({ queryKey: staffKeys.capacity });
    },
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UpdateStaffDto }) => staffApi.updateStaff(userId, data),
    onSuccess: (data) => {
      queryClient.setQueryData(staffKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: staffKeys.all });
    },
  });
}

export function useDeactivateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: staffApi.deactivateStaff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all });
      queryClient.invalidateQueries({ queryKey: staffKeys.capacity });
    },
  });
}

export function useReactivateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: staffApi.reactivateStaff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all });
      queryClient.invalidateQueries({ queryKey: staffKeys.capacity });
    },
  });
}
