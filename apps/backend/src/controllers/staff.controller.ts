import type { Response } from 'express';
import httpStatus from 'http-status';
import { staffService } from '../services';
import type { AuthRequest } from '../types';
import { catchAsync } from '../utils/catchAsync';

const inviteStaff = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = req.user as { id: string; tenantId: string | null };
  if (!user.tenantId) {
    throw new Error('User does not have a tenant');
  }
  await staffService.inviteStaff(user.id, user.tenantId, req.body);
  res.status(httpStatus.CREATED).send({ message: 'Invitation sent' });
});

const getStaff = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = req.user as { id: string; tenantId: string | null };
  if (!user.tenantId) {
    throw new Error('User does not have a tenant');
  }
  const result = await staffService.queryStaff(user.tenantId, req.query as Record<string, unknown>, {
    sortBy: req.query.sortBy as string | undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    page: req.query.page ? Number(req.query.page) : undefined,
  });
  res.send(result);
});

const getCapacity = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = req.user as { id: string; tenantId: string | null };
  if (!user.tenantId) {
    throw new Error('User does not have a tenant');
  }
  const result = await staffService.getCapacity(user.tenantId);
  res.send(result);
});

const getStaffById = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = req.user as { id: string; tenantId: string | null };
  if (!user.tenantId) {
    throw new Error('User does not have a tenant');
  }
  const staff = await staffService.getStaffById(user.tenantId, req.params.userId);
  res.send(staff);
});

const updateStaff = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = req.user as { id: string; tenantId: string | null };
  if (!user.tenantId) {
    throw new Error('User does not have a tenant');
  }
  const staff = await staffService.updateStaff(user.tenantId, req.params.userId, req.body);
  res.send(staff);
});

const deactivateStaff = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = req.user as { id: string; tenantId: string | null };
  if (!user.tenantId) {
    throw new Error('User does not have a tenant');
  }
  await staffService.deactivateStaff(user.tenantId, req.params.userId);
  res.status(httpStatus.NO_CONTENT).send();
});

const reactivateStaff = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = req.user as { id: string; tenantId: string | null };
  if (!user.tenantId) {
    throw new Error('User does not have a tenant');
  }
  const staff = await staffService.reactivateStaff(user.tenantId, req.params.userId);
  res.send(staff);
});

const staffController = {
  inviteStaff,
  getStaff,
  getCapacity,
  getStaffById,
  updateStaff,
  deactivateStaff,
  reactivateStaff,
};

export default staffController;
