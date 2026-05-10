import type { Response } from 'express';
import httpStatus from 'http-status';
import { departmentService } from '../services';
import type { AuthRequest } from '../types';
import { ApiError } from '../utils/ApiError';
import { catchAsync } from '../utils/catchAsync';

const create = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = req.user as { tenantId: string | null };
  if (!user.tenantId) throw new ApiError(httpStatus.FORBIDDEN, 'No clinic associated');
  const dept = await departmentService.create(user.tenantId, req.body);
  res.status(httpStatus.CREATED).send(dept);
});

const list = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = req.user as { tenantId: string | null };
  if (!user.tenantId) throw new ApiError(httpStatus.FORBIDDEN, 'No clinic associated');
  const depts = await departmentService.list(user.tenantId);
  res.send(depts);
});

const update = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = req.user as { tenantId: string | null };
  if (!user.tenantId) throw new ApiError(httpStatus.FORBIDDEN, 'No clinic associated');
  const dept = await departmentService.update(user.tenantId, req.params.id, req.body);
  res.send(dept);
});

const remove = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = req.user as { tenantId: string | null };
  if (!user.tenantId) throw new ApiError(httpStatus.FORBIDDEN, 'No clinic associated');
  await departmentService.remove(user.tenantId, req.params.id);
  res.status(httpStatus.NO_CONTENT).send();
});

const departmentController = { create, list, update, remove };
export default departmentController;
