import { z } from 'zod';

export const CreateDepartmentDtoSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  headUserId: z.string().uuid().nullable().optional(),
  description: z.string().max(500).nullable().optional(),
});

export const UpdateDepartmentDtoSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    headUserId: z.string().uuid().nullable().optional(),
    description: z.string().max(500).nullable().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, 'At least one field is required');

export const DepartmentDtoSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  headUserId: z.string().uuid().nullable(),
  description: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type CreateDepartmentDto = z.infer<typeof CreateDepartmentDtoSchema>;
export type UpdateDepartmentDto = z.infer<typeof UpdateDepartmentDtoSchema>;
export type DepartmentDto = z.infer<typeof DepartmentDtoSchema>;
