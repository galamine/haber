import { z } from 'zod';

export const ClinicDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  address: z.string(),
  contactPhone: z.string(),
  contactEmail: z.string(),
  timezone: z.string(),
  subscriptionPlanId: z.string().uuid().nullable(),
  status: z.enum(['active', 'suspended']),
  deletedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateClinicDtoSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required'),
  contactPhone: z.string().min(1, 'Contact phone is required'),
  contactEmail: z.string().email('Invalid email address'),
  timezone: z.string().min(1, 'Timezone is required'),
  subscriptionPlanId: z.string().uuid().optional(),
});

export const UpdateClinicDtoSchema = z
  .object({
    name: z.string().min(1).optional(),
    address: z.string().min(1).optional(),
    contactPhone: z.string().min(1).optional(),
    contactEmail: z.string().email().optional(),
    timezone: z.string().min(1).optional(),
    subscriptionPlanId: z.string().uuid().nullable().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, 'At least one field is required');

export const PaginatedClinicsDtoSchema = z.object({
  results: z.array(ClinicDtoSchema),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
  totalResults: z.number().int().nonnegative(),
});

export type ClinicDto = z.infer<typeof ClinicDtoSchema>;
export type CreateClinicDto = z.infer<typeof CreateClinicDtoSchema>;
export type UpdateClinicDto = z.infer<typeof UpdateClinicDtoSchema>;
export type PaginatedClinicsDto = z.infer<typeof PaginatedClinicsDtoSchema>;
