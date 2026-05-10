import { z } from 'zod';

export const InviteStaffDtoSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['therapist', 'staff']),
  permissions: z.string().array().default([]),
  departmentIds: z.string().uuid().array().default([]),
});

export const UpdateStaffDtoSchema = z
  .object({
    permissions: z.string().array().optional(),
    departmentIds: z.string().uuid().array().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, 'At least one field is required');

export const StaffDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['therapist', 'staff']),
  isActive: z.boolean(),
  permissions: z.string().array(),
  departmentIds: z.string().uuid().array(),
  invitedByUserId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CapacityEntrySchema = z.object({
  role: z.string(),
  active: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  limit: z.number().int().nonnegative().nullable(),
});

export const PaginatedStaffDtoSchema = z.object({
  results: z.array(StaffDtoSchema),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
  totalResults: z.number().int().nonnegative(),
});

export type InviteStaffDto = z.infer<typeof InviteStaffDtoSchema>;
export type UpdateStaffDto = z.infer<typeof UpdateStaffDtoSchema>;
export type StaffDto = z.infer<typeof StaffDtoSchema>;
export type CapacityEntry = z.infer<typeof CapacityEntrySchema>;
export type PaginatedStaffDto = z.infer<typeof PaginatedStaffDtoSchema>;
