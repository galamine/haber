import type { RoomStatus } from '@prisma/client';
import type { Response } from 'express';
import httpStatus from 'http-status';
import { sensoryRoomService } from '../services';
import type { AuthRequest } from '../types';
import { ApiError } from '../utils/ApiError';
import { catchAsync } from '../utils/catchAsync';

const getTenantId = (req: AuthRequest): string => {
  const user = req.user as { tenantId: string | null };
  if (!user.tenantId) throw new ApiError(httpStatus.FORBIDDEN, 'No clinic associated');
  return user.tenantId;
};

const create = catchAsync(async (req: AuthRequest, res: Response) => {
  const room = await sensoryRoomService.create(getTenantId(req), req.body);
  res.status(httpStatus.CREATED).send(room);
});

const list = catchAsync(async (req: AuthRequest, res: Response) => {
  const status = req.query.status as RoomStatus | undefined;
  const rooms = await sensoryRoomService.list(getTenantId(req), status);
  res.send(rooms);
});

const getOne = catchAsync(async (req: AuthRequest, res: Response) => {
  const room = await sensoryRoomService.getOne(getTenantId(req), req.params.id);
  res.send(room);
});

const update = catchAsync(async (req: AuthRequest, res: Response) => {
  const room = await sensoryRoomService.update(getTenantId(req), req.params.id, req.body);
  res.send(room);
});

const remove = catchAsync(async (req: AuthRequest, res: Response) => {
  await sensoryRoomService.remove(getTenantId(req), req.params.id);
  res.status(httpStatus.NO_CONTENT).send();
});

const sensoryRoomController = { create, list, getOne, update, remove };
export default sensoryRoomController;
