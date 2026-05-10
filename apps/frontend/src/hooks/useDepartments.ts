import type { CreateDepartmentDto, UpdateDepartmentDto } from '@haber/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DepartmentDto } from '@/api/departments';
import { departmentsApi } from '@/api/departments';

export const departmentKeys = {
  all: ['departments'] as const,
  list: () => [...departmentKeys.all, 'list'] as const,
};

export function useDepartments() {
  return useQuery({
    queryKey: departmentKeys.list(),
    queryFn: departmentsApi.list,
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDepartmentDto) => departmentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentKeys.all });
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDepartmentDto }) => departmentsApi.update(id, data),
    onSuccess: (updated: DepartmentDto) => {
      queryClient.setQueryData<DepartmentDto[]>(departmentKeys.list(), (prev) =>
        prev?.map((d) => (d.id === updated.id ? updated : d))
      );
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => departmentsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentKeys.all });
    },
  });
}
