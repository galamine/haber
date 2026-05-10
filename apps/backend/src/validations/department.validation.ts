import { CreateDepartmentDtoSchema, UpdateDepartmentDtoSchema } from '@haber/shared';
import { z } from 'zod';

const idParam = z.object({ id: z.string().uuid('Invalid department ID') });

export default {
  create: { body: CreateDepartmentDtoSchema },
  list: {},
  update: { params: idParam, body: UpdateDepartmentDtoSchema },
  remove: { params: idParam },
};
