import type { CreateDepartmentDto, UpdateDepartmentDto } from '@haber/shared';
import httpStatus from 'http-status';
import prisma from '../config/prisma';
import { ApiError } from '../utils/ApiError';

interface DepartmentShape {
  id: string;
  tenantId: string;
  name: string;
  headUserId: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const departmentSelect = {
  id: true,
  tenantId: true,
  name: true,
  headUserId: true,
  description: true,
  createdAt: true,
  updatedAt: true,
} as const;

const create = async (tenantId: string, body: CreateDepartmentDto): Promise<DepartmentShape> => {
  return prisma.department.create({
    data: {
      tenantId,
      name: body.name,
      headUserId: body.headUserId ?? null,
      description: body.description ?? null,
    },
    select: departmentSelect,
  });
};

const list = async (tenantId: string): Promise<DepartmentShape[]> => {
  return prisma.department.findMany({
    where: { tenantId },
    select: departmentSelect,
    orderBy: { createdAt: 'asc' },
  });
};

const update = async (tenantId: string, departmentId: string, body: UpdateDepartmentDto): Promise<DepartmentShape> => {
  const dept = await prisma.department.findFirst({ where: { id: departmentId, tenantId } });
  if (!dept) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Department not found');
  }

  return prisma.department.update({
    where: { id: departmentId },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.headUserId !== undefined && { headUserId: body.headUserId }),
      ...(body.description !== undefined && { description: body.description }),
    },
    select: departmentSelect,
  });
};

const remove = async (tenantId: string, departmentId: string): Promise<void> => {
  const dept = await prisma.department.findFirst({ where: { id: departmentId, tenantId } });
  if (!dept) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Department not found');
  }

  const roomCount = await prisma.sensoryRoom.count({ where: { departmentId } });
  if (roomCount > 0) {
    throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'DEPARTMENT_HAS_ROOMS');
  }

  await prisma.department.delete({ where: { id: departmentId } });
};

export const departmentService = { create, list, update, remove };
