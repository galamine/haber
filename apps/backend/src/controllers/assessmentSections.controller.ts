import type { Response } from 'express';
import { assessmentSectionsService } from '../services';
import type { AuthRequest } from '../types';
import { catchAsync } from '../utils/catchAsync';

const getUser = (req: AuthRequest) => {
  const user = req.user as { id: string; role: string; tenantId: string | null };
  if (!user.tenantId) throw new Error('User does not have a tenant');
  return user as { id: string; role: string; tenantId: string };
};

const upsertMilestones = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = getUser(req);
  const result = await assessmentSectionsService.upsertMilestones(
    req.params.childId,
    req.params.assessmentId,
    user.tenantId,
    user.id,
    user.role,
    req.body.milestones
  );
  res.send(result);
});

const getMilestones = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = getUser(req);
  const result = await assessmentSectionsService.getMilestones(
    req.params.childId,
    req.params.assessmentId,
    user.tenantId,
    user.id,
    user.role
  );
  res.send(result);
});

const upsertSensoryProfile = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = getUser(req);
  const result = await assessmentSectionsService.upsertSensoryProfile(
    req.params.childId,
    req.params.assessmentId,
    user.tenantId,
    user.id,
    user.role,
    req.body.ratings,
    req.body.sensoryObservations
  );
  res.send(result);
});

const getSensoryProfile = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = getUser(req);
  const result = await assessmentSectionsService.getSensoryProfile(
    req.params.childId,
    req.params.assessmentId,
    user.tenantId,
    user.id,
    user.role
  );
  res.send(result);
});

const upsertFunctionalConcerns = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = getUser(req);
  const result = await assessmentSectionsService.upsertFunctionalConcerns(
    req.params.childId,
    req.params.assessmentId,
    user.tenantId,
    user.id,
    user.role,
    req.body.functionalConcernIds,
    req.body.clinicalObservations
  );
  res.send(result);
});

const getFunctionalConcerns = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = getUser(req);
  const result = await assessmentSectionsService.getFunctionalConcerns(
    req.params.childId,
    req.params.assessmentId,
    user.tenantId,
    user.id,
    user.role
  );
  res.send(result);
});

const assessmentSectionsController = {
  upsertMilestones,
  getMilestones,
  upsertSensoryProfile,
  getSensoryProfile,
  upsertFunctionalConcerns,
  getFunctionalConcerns,
};

export default assessmentSectionsController;
