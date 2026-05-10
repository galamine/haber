import { z } from 'zod';
import { USER_ROLES } from '../constants/roles';

export const UserDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(USER_ROLES),
  tenantId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateUserDtoSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  role: z.enum(USER_ROLES),
});

export const UpdateUserDtoSchema = z
  .object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, 'At least one field is required');

export const PaginatedUsersDtoSchema = z.object({
  results: z.array(UserDtoSchema),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
  totalResults: z.number().int().nonnegative(),
});

export type UserDto = z.infer<typeof UserDtoSchema>;
export type CreateUserDto = z.infer<typeof CreateUserDtoSchema>;
export type UpdateUserDto = z.infer<typeof UpdateUserDtoSchema>;
export type PaginatedUsersDto = z.infer<typeof PaginatedUsersDtoSchema>;
