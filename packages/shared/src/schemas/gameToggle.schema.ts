import { z } from 'zod';

export const UpdateGameToggleDtoSchema = z.object({
  gameId: z.string().uuid('Invalid game ID'),
  enabled: z.boolean(),
});

export type UpdateGameToggleDto = z.infer<typeof UpdateGameToggleDtoSchema>;
