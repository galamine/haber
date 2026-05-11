import type { Response } from 'express';
import httpStatus from 'http-status';
import { childService } from '../services';
import type { AuthRequest } from '../types';
import { catchAsync } from '../utils/catchAsync';

const createChild = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = req.user as { id: string; tenantId: string | null };
  if (!user.tenantId) {
    throw new Error('User does not have a tenant');
  }
  const child = await childService.createChild(user.id, user.tenantId, req.body);
  res.status(httpStatus.CREATED).send(child);
});

const getChildren = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = req.user as { id: string; tenantId: string | null; role: string };
  if (!user.tenantId) {
    throw new Error('User does not have a tenant');
  }
  const result = await childService.queryChildren(
    user.id,
    user.role,
    user.tenantId,
    {
      name: req.query.name as string | undefined,
      opNumber: req.query.opNumber as string | undefined,
      includeDeleted: req.query.includeDeleted === 'true',
    },
    {
      sortBy: req.query.sortBy as string | undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
    }
  );
  res.send(result);
});

const getChildById = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = req.user as { id: string; tenantId: string | null; role: string };
  if (!user.tenantId) {
    throw new Error('User does not have a tenant');
  }
  const child = await childService.getChildById(user.id, user.role, user.tenantId, req.params.childId);
  res.send(child);
});

const updateChild = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = req.user as { id: string; tenantId: string | null };
  if (!user.tenantId) {
    throw new Error('User does not have a tenant');
  }
  const child = await childService.updateChild(user.tenantId, req.params.childId, req.body);
  res.send(child);
});

const upsertMedicalHistory = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = req.user as { id: string; tenantId: string | null };
  if (!user.tenantId) {
    throw new Error('User does not have a tenant');
  }
  const child = await childService.upsertMedicalHistory(user.tenantId, req.params.childId, req.body);
  res.send(child);
});

const createGuardian = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = req.user as { id: string; tenantId: string | null };
  if (!user.tenantId) {
    throw new Error('User does not have a tenant');
  }
  const guardian = await childService.createGuardian(user.tenantId, req.params.childId, req.body);
  res.status(httpStatus.CREATED).send(guardian);
});

const updateGuardian = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = req.user as { id: string; tenantId: string | null };
  if (!user.tenantId) {
    throw new Error('User does not have a tenant');
  }
  const guardian = await childService.updateGuardian(user.tenantId, req.params.childId, req.params.guardianId, req.body);
  res.send(guardian);
});

const getIntakeStatus = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = req.user as { id: string; tenantId: string | null };
  if (!user.tenantId) {
    throw new Error('User does not have a tenant');
  }
  const status = await childService.getIntakeStatus(user.tenantId, req.params.childId);
  res.send(status);
});

const softDeleteChild = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = req.user as { id: string; tenantId: string | null; role: string };
  if (!user.tenantId) {
    throw new Error('User does not have a tenant');
  }
  await childService.softDeleteChild(user.tenantId, req.params.childId, user.role);
  res.status(httpStatus.NO_CONTENT).send();
});

const childController = {
  createChild,
  getChildren,
  getChildById,
  updateChild,
  upsertMedicalHistory,
  createGuardian,
  updateGuardian,
  getIntakeStatus,
  softDeleteChild,
};

export default childController;
