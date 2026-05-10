import type { UpdateClinicDto } from '@haber/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GetClinicsParams } from '@/api/clinics';
import { clinicsApi } from '@/api/clinics';

export const clinicKeys = {
  all: ['clinics'] as const,
  list: (params?: object) => [...clinicKeys.all, 'list', params] as const,
  detail: (id: string) => [...clinicKeys.all, 'detail', id] as const,
  me: () => [...clinicKeys.all, 'me'] as const,
};

export function useClinics(params?: GetClinicsParams) {
  return useQuery({
    queryKey: clinicKeys.list(params),
    queryFn: () => clinicsApi.getClinics(params),
  });
}

export function useClinic(clinicId: string) {
  return useQuery({
    queryKey: clinicKeys.detail(clinicId),
    queryFn: () => clinicsApi.getClinic(clinicId),
    enabled: !!clinicId,
  });
}

export function useMyClinic() {
  return useQuery({
    queryKey: clinicKeys.me(),
    queryFn: clinicsApi.getMyClinic,
  });
}

export function useCreateClinic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clinicsApi.createClinic,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clinicKeys.all });
    },
  });
}

export function useUpdateClinic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateClinicDto }) => clinicsApi.updateClinic(id, data),
    onSuccess: (data) => {
      queryClient.setQueryData(clinicKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: clinicKeys.all });
    },
  });
}

export function useSuspendClinic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clinicsApi.suspendClinic,
    onSuccess: (data) => {
      queryClient.setQueryData(clinicKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: clinicKeys.all });
    },
  });
}

export function useReactivateClinic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clinicsApi.reactivateClinic,
    onSuccess: (data) => {
      queryClient.setQueryData(clinicKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: clinicKeys.all });
    },
  });
}
