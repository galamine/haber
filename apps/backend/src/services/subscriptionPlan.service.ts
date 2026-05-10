import type { Prisma, SubscriptionTier } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../config/prisma';
import { ApiError } from '../utils/ApiError';

interface PaginateOptions {
  sortBy?: string;
  limit?: number;
  page?: number;
}

interface QueryResult {
  results: SubscriptionPlanShape[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

interface CreateSubscriptionPlanBody {
  name: string;
  tier: SubscriptionTier;
  maxUsersByRole?: Prisma.InputJsonValue;
  maxSensoryRooms?: number;
  maxActiveChildren?: number;
  featureFlags?: Prisma.InputJsonValue;
}

interface UpdateSubscriptionPlanBody {
  name?: string;
  tier?: SubscriptionTier;
  maxUsersByRole?: Prisma.InputJsonValue;
  maxSensoryRooms?: number;
  maxActiveChildren?: number;
  featureFlags?: Prisma.InputJsonValue;
}

interface SubscriptionPlanShape {
  id: string;
  name: string;
  tier: SubscriptionTier;
  maxUsersByRole: Prisma.JsonValue;
  maxSensoryRooms: number;
  maxActiveChildren: number;
  featureFlags: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionPlanSelect = {
  id: true,
  name: true,
  tier: true,
  maxUsersByRole: true,
  maxSensoryRooms: true,
  maxActiveChildren: true,
  featureFlags: true,
  createdAt: true,
  updatedAt: true,
} as const;

const createSubscriptionPlan = async (body: CreateSubscriptionPlanBody): Promise<SubscriptionPlanShape> => {
  return prisma.subscriptionPlan.create({
    data: {
      name: body.name,
      tier: body.tier,
      maxUsersByRole: body.maxUsersByRole ?? {},
      maxSensoryRooms: body.maxSensoryRooms ?? 0,
      maxActiveChildren: body.maxActiveChildren ?? 0,
      featureFlags: body.featureFlags ?? {},
    },
    select: subscriptionPlanSelect,
  });
};

const querySubscriptionPlans = async (options: PaginateOptions): Promise<QueryResult> => {
  const { sortBy, limit = 10, page = 1 } = options;
  const skip = (page - 1) * Number(limit);

  const orderBy: Record<string, 'asc' | 'desc'>[] = sortBy
    ? sortBy.split(',').map((criterion) => {
        const [field, order] = criterion.split(':');
        return { [field]: order === 'desc' ? 'desc' : 'asc' };
      })
    : [{ createdAt: 'asc' }];

  const [results, totalResults] = await Promise.all([
    prisma.subscriptionPlan.findMany({ skip, take: Number(limit), orderBy, select: subscriptionPlanSelect }),
    prisma.subscriptionPlan.count(),
  ]);

  return {
    results,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(totalResults / Number(limit)),
    totalResults,
  };
};

const getSubscriptionPlanById = async (planId: string): Promise<SubscriptionPlanShape> => {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId }, select: subscriptionPlanSelect });
  if (!plan) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Subscription plan not found');
  }
  return plan;
};

const updateSubscriptionPlan = async (
  planId: string,
  updateBody: UpdateSubscriptionPlanBody
): Promise<SubscriptionPlanShape> => {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
  if (!plan) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Subscription plan not found');
  }
  return prisma.subscriptionPlan.update({
    where: { id: planId },
    data: updateBody,
    select: subscriptionPlanSelect,
  });
};

export const subscriptionPlanService = {
  createSubscriptionPlan,
  querySubscriptionPlans,
  getSubscriptionPlanById,
  updateSubscriptionPlan,
};
