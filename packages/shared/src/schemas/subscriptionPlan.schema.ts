import { z } from 'zod';

export const SubscriptionTierEnum = z.enum(['basic', 'advanced', 'enterprise']);
export type SubscriptionTierEnum = z.infer<typeof SubscriptionTierEnum>;

export const SubscriptionPlanDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  tier: SubscriptionTierEnum,
  maxUsersByRole: z.unknown(),
  maxSensoryRooms: z.number().int().nonnegative(),
  maxActiveChildren: z.number().int().nonnegative(),
  featureFlags: z.unknown(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateSubscriptionPlanDtoSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  tier: SubscriptionTierEnum,
  maxUsersByRole: z.record(z.string(), z.number()).default({}),
  maxSensoryRooms: z.number().int().nonnegative().default(0),
  maxActiveChildren: z.number().int().nonnegative().default(0),
  featureFlags: z.record(z.string(), z.boolean()).default({}),
});

export const UpdateSubscriptionPlanDtoSchema = z
  .object({
    name: z.string().min(1).optional(),
    tier: SubscriptionTierEnum.optional(),
    maxUsersByRole: z.record(z.string(), z.number()).optional(),
    maxSensoryRooms: z.number().int().nonnegative().optional(),
    maxActiveChildren: z.number().int().nonnegative().optional(),
    featureFlags: z.record(z.string(), z.boolean()).optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, 'At least one field is required');

export const PaginatedSubscriptionPlansDtoSchema = z.object({
  results: z.array(SubscriptionPlanDtoSchema),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
  totalResults: z.number().int().nonnegative(),
});

export type SubscriptionPlanDto = z.infer<typeof SubscriptionPlanDtoSchema>;
export type CreateSubscriptionPlanDto = z.infer<typeof CreateSubscriptionPlanDtoSchema>;
export type UpdateSubscriptionPlanDto = z.infer<typeof UpdateSubscriptionPlanDtoSchema>;
export type PaginatedSubscriptionPlansDto = z.infer<typeof PaginatedSubscriptionPlansDtoSchema>;
