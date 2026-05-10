import { CreateSensoryRoomDtoSchema, UpdateSensoryRoomDtoSchema } from '@haber/shared';
import { z } from 'zod';

const idParam = z.object({ id: z.string().uuid('Invalid room ID') });

export default {
  create: { body: CreateSensoryRoomDtoSchema },
  list: {
    query: z.object({
      status: z.enum(['active', 'maintenance']).optional(),
    }),
  },
  getOne: { params: idParam },
  update: { params: idParam, body: UpdateSensoryRoomDtoSchema },
  remove: { params: idParam },
};
