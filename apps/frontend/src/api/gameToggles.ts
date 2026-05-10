import type { UpdateGameToggleDto } from '@haber/shared';
import { apiClient } from './client';

export interface GameToggleEntry {
  game: { id: string; name: string; description: string | null };
  enabled: boolean;
}

export const gameTogglesApi = {
  list: () => apiClient.get<GameToggleEntry[]>('/v1/clinic/game-toggles'),
  upsert: (data: UpdateGameToggleDto) => apiClient.patch<GameToggleEntry>('/v1/clinic/game-toggles', data),
};
