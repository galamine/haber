import { CreateSubscriptionPlanDtoSchema, UpdateSubscriptionPlanDtoSchema } from '@haber/shared';
import { z } from 'zod';

const uuidParam = z.object({ planId: z.string().uuid('Invalid plan ID') });

const createSubscriptionPlan = { body: CreateSubscriptionPlanDtoSchema };

const getSubscriptionPlans = {
  query: z.object({
    sortBy: z.string().optional(),
    limit: z.coerce.number().int().positive().optional(),
    page: z.coerce.number().int().positive().optional(),
  }),
};

const getSubscriptionPlan = { params: uuidParam };

const updateSubscriptionPlan = {
  params: uuidParam,
  body: UpdateSubscriptionPlanDtoSchema,
};

export default {
  createSubscriptionPlan,
  getSubscriptionPlans,
  getSubscriptionPlan,
  updateSubscriptionPlan,
};
