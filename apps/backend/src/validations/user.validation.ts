import { CreateUserDtoSchema, UpdateUserDtoSchema } from '@haber/shared';
import { z } from 'zod';

const uuidParam = z.object({ userId: z.string().uuid('Invalid user ID') });

const createUser = { body: CreateUserDtoSchema };

const getUsers = {
  query: z.object({
    name: z.string().optional(),
    role: z.enum(['super_admin', 'clinic_admin', 'therapist', 'staff']).optional(),
    sortBy: z.string().optional(),
    limit: z.coerce.number().int().positive().optional(),
    page: z.coerce.number().int().positive().optional(),
  }),
};

const getUser = { params: uuidParam };

const updateUser = {
  params: uuidParam,
  body: UpdateUserDtoSchema,
};

const deleteUser = { params: uuidParam };

export default { createUser, getUsers, getUser, updateUser, deleteUser };
