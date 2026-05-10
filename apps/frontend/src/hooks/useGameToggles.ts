import type { UpdateGameToggleDto } from '@haber/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { gameTogglesApi } from '@/api/gameToggles';

export const gameToggleKeys = {
  all: ['game-toggles'] as const,
  list: () => [...gameToggleKeys.all, 'list'] as const,
};

export function useGameToggles() {
  return useQuery({
    queryKey: gameToggleKeys.list(),
    queryFn: gameTogglesApi.list,
  });
}

export function useUpsertGameToggle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateGameToggleDto) => gameTogglesApi.upsert(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gameToggleKeys.all });
    },
  });
}
