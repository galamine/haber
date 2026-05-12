import type { Response } from 'express';
import { assessmentFinalSectionsService } from '../services';
import type { AuthRequest } from '../types';
import { catchAsync } from '../utils/catchAsync';

const getUser = (req: AuthRequest) => {
  const user = req.user as { id: string; role: string; tenantId: string | null };
  if (!user.tenantId) throw new Error('User does not have a tenant');
  return user as { id: string; role: string; tenantId: string };
};

const upsertToolResults = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = getUser(req);
  const result = await assessmentFinalSectionsService.upsertToolResults(
    req.params.childId,
    req.params.assessmentId,
    user.tenantId,
    user.id,
    user.role,
    req.body.toolResults,
    req.body.overallScoresSummary
  );
  res.send(result);
});

const getToolResults = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = getUser(req);
  const result = await assessmentFinalSectionsService.getToolResults(
    req.params.childId,
    req.params.assessmentId,
    user.tenantId,
    user.id,
    user.role
  );
  res.send(result);
});

const upsertInterventionPlan = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = getUser(req);
  const result = await assessmentFinalSectionsService.upsertInterventionPlan(
    req.params.childId,
    req.params.assessmentId,
    user.tenantId,
    user.id,
    user.role,
    req.body
  );
  res.send(result);
});

const getInterventionPlan = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = getUser(req);
  const result = await assessmentFinalSectionsService.getInterventionPlan(
    req.params.childId,
    req.params.assessmentId,
    user.tenantId,
    user.id,
    user.role
  );
  res.send(result);
});

const signAssessment = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = getUser(req);
  const ipAddress = req.ip ?? 'unknown';
  const result = await assessmentFinalSectionsService.signAssessment(
    req.params.childId,
    req.params.assessmentId,
    user.tenantId,
    user.id,
    user.role,
    req.body,
    ipAddress
  );
  res.send(result);
});

const getSignatures = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = getUser(req);
  const result = await assessmentFinalSectionsService.getSignatures(
    req.params.childId,
    req.params.assessmentId,
    user.tenantId,
    user.id,
    user.role
  );
  res.send(result);
});

const assessmentFinalSectionsController = {
  upsertToolResults,
  getToolResults,
  upsertInterventionPlan,
  getInterventionPlan,
  signAssessment,
  getSignatures,
};

export default assessmentFinalSectionsController;
