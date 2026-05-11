import type { Response } from 'express';
import httpStatus from 'http-status';
import { assessmentService } from '../services';
import type { AuthRequest } from '../types';
import { catchAsync } from '../utils/catchAsync';

const getUser = (req: AuthRequest) => {
  const user = req.user as { id: string; role: string; tenantId: string | null };
  if (!user.tenantId) throw new Error('User does not have a tenant');
  return user as { id: string; role: string; tenantId: string };
};

const createAssessment = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = getUser(req);
  const result = await assessmentService.createAssessment(
    req.params.childId,
    user.tenantId,
    user.id,
    user.role,
    req.body.assessmentDate
  );
  res.status(httpStatus.CREATED).send(result);
});

const listAssessments = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = getUser(req);
  const result = await assessmentService.listAssessments(req.params.childId, user.tenantId, user.id, user.role);
  res.send(result);
});

const getAssessment = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = getUser(req);
  const result = await assessmentService.getAssessment(
    req.params.childId,
    req.params.assessmentId,
    user.tenantId,
    user.id,
    user.role
  );
  res.send(result);
});

const updateAssessment = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = getUser(req);
  const result = await assessmentService.updateAssessment(
    req.params.childId,
    req.params.assessmentId,
    user.tenantId,
    user.id,
    user.role,
    req.body
  );
  res.send(result);
});

const finaliseAssessment = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = getUser(req);
  const result = await assessmentService.finaliseAssessment(
    req.params.childId,
    req.params.assessmentId,
    user.tenantId,
    user.id,
    user.role
  );
  res.send(result);
});

const assessmentController = {
  createAssessment,
  listAssessments,
  getAssessment,
  updateAssessment,
  finaliseAssessment,
};

export default assessmentController;
