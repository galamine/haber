import type { CreateSensoryRoomDto, UpdateSensoryRoomDto } from '@haber/shared';
import type { RoomStatus } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../config/prisma';
import { ApiError } from '../utils/ApiError';

interface RoomShape {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  departmentId: string | null;
  equipmentList: string[];
  status: RoomStatus;
  createdAt: Date;
  updatedAt: Date;
}

const roomSelect = {
  id: true,
  tenantId: true,
  name: true,
  code: true,
  departmentId: true,
  equipmentList: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

const assertCodeAvailable = async (tenantId: string, code: string, excludeId?: string): Promise<void> => {
  const existing = await prisma.sensoryRoom.findFirst({
    where: { tenantId, code, ...(excludeId ? { id: { not: excludeId } } : {}) },
  });
  if (existing) {
    throw new ApiError(httpStatus.CONFLICT, 'ROOM_CODE_TAKEN');
  }
};

const create = async (tenantId: string, body: CreateSensoryRoomDto): Promise<RoomShape> => {
  const clinic = await prisma.clinic.findFirst({
    where: { id: tenantId, deletedAt: null },
    select: { subscriptionPlan: { select: { maxSensoryRooms: true } } },
  });

  if (!clinic) throw new ApiError(httpStatus.NOT_FOUND, 'Clinic not found');

  const limit = clinic.subscriptionPlan?.maxSensoryRooms ?? null;
  if (limit !== null) {
    const count = await prisma.sensoryRoom.count({ where: { tenantId } });
    if (count >= limit) throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'SENSORY_ROOM_LIMIT_REACHED');
  }

  await assertCodeAvailable(tenantId, body.code);

  return prisma.sensoryRoom.create({
    data: {
      tenantId,
      name: body.name,
      code: body.code,
      departmentId: body.departmentId ?? null,
      equipmentList: body.equipmentList ?? [],
      status: body.status ?? 'active',
    },
    select: roomSelect,
  }) as Promise<RoomShape>;
};

const list = async (tenantId: string, statusFilter?: RoomStatus): Promise<RoomShape[]> => {
  return prisma.sensoryRoom.findMany({
    where: { tenantId, ...(statusFilter ? { status: statusFilter } : {}) },
    select: roomSelect,
    orderBy: { createdAt: 'asc' },
  }) as Promise<RoomShape[]>;
};

const getOne = async (tenantId: string, roomId: string): Promise<RoomShape> => {
  const room = await prisma.sensoryRoom.findFirst({ where: { id: roomId, tenantId }, select: roomSelect });
  if (!room) throw new ApiError(httpStatus.NOT_FOUND, 'Sensory room not found');
  return room as RoomShape;
};

const update = async (tenantId: string, roomId: string, body: UpdateSensoryRoomDto): Promise<RoomShape> => {
  const room = await prisma.sensoryRoom.findFirst({ where: { id: roomId, tenantId } });
  if (!room) throw new ApiError(httpStatus.NOT_FOUND, 'Sensory room not found');

  if (body.code && body.code !== room.code) {
    await assertCodeAvailable(tenantId, body.code, roomId);
  }

  return prisma.sensoryRoom.update({
    where: { id: roomId },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.code !== undefined && { code: body.code }),
      ...(body.departmentId !== undefined && { departmentId: body.departmentId }),
      ...(body.equipmentList !== undefined && { equipmentList: body.equipmentList }),
      ...(body.status !== undefined && { status: body.status }),
    },
    select: roomSelect,
  }) as Promise<RoomShape>;
};

const remove = async (tenantId: string, roomId: string): Promise<void> => {
  const room = await prisma.sensoryRoom.findFirst({ where: { id: roomId, tenantId } });
  if (!room) throw new ApiError(httpStatus.NOT_FOUND, 'Sensory room not found');
  await prisma.sensoryRoom.delete({ where: { id: roomId } });
};

export const sensoryRoomService = { create, list, getOne, update, remove };
