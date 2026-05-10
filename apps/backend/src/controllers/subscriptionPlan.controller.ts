import type { Response } from 'express';
import httpStatus from 'http-status';
import { subscriptionPlanService } from '../services';
import type { AuthRequest, PaginateQuery } from '../types';
import { catchAsync } from '../utils/catchAsync';
import { pick } from '../utils/pick';

const createSubscriptionPlan = catchAsync(async (req: AuthRequest, res: Response) => {
  const plan = await subscriptionPlanService.createSubscriptionPlan(req.body);
  res.status(httpStatus.CREATED).send(plan);
});

const getSubscriptionPlans = catchAsync(async (req: PaginateQuery, res: Response) => {
  const options = pick(req.query, ['sortBy', 'limit', 'page']) as Record<string, unknown>;
  const result = await subscriptionPlanService.querySubscriptionPlans(options);
  res.send(result);
});

const getSubscriptionPlan = catchAsync(async (req: AuthRequest, res: Response) => {
  const plan = await subscriptionPlanService.getSubscriptionPlanById(req.params.planId);
  res.send(plan);
});

const updateSubscriptionPlan = catchAsync(async (req: AuthRequest, res: Response) => {
  const plan = await subscriptionPlanService.updateSubscriptionPlan(req.params.planId, req.body);
  res.send(plan);
});

const subscriptionPlanController = {
  createSubscriptionPlan,
  getSubscriptionPlans,
  getSubscriptionPlan,
  updateSubscriptionPlan,
};

export default subscriptionPlanController;
