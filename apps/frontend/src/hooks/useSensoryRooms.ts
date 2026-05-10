import type { CreateSensoryRoomDto, UpdateSensoryRoomDto } from '@haber/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SensoryRoomDto } from '@/api/sensoryRooms';
import { sensoryRoomsApi } from '@/api/sensoryRooms';

export const sensoryRoomKeys = {
  all: ['sensory-rooms'] as const,
  list: (status?: string) => [...sensoryRoomKeys.all, 'list', status] as const,
  detail: (id: string) => [...sensoryRoomKeys.all, 'detail', id] as const,
};

export function useSensoryRooms(status?: 'active' | 'maintenance') {
  return useQuery({
    queryKey: sensoryRoomKeys.list(status),
    queryFn: () => sensoryRoomsApi.list(status),
  });
}

export function useCreateSensoryRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSensoryRoomDto) => sensoryRoomsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sensoryRoomKeys.all });
    },
  });
}

export function useUpdateSensoryRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSensoryRoomDto }) => sensoryRoomsApi.update(id, data),
    onSuccess: (updated: SensoryRoomDto) => {
      queryClient.setQueryData<SensoryRoomDto[]>(sensoryRoomKeys.list(), (prev) =>
        prev?.map((r) => (r.id === updated.id ? updated : r))
      );
      queryClient.invalidateQueries({ queryKey: sensoryRoomKeys.all });
    },
  });
}

export function useDeleteSensoryRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sensoryRoomsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sensoryRoomKeys.all });
    },
  });
}
