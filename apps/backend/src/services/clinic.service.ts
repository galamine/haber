import type { ClinicStatus, Prisma } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../config/prisma';
import { ApiError } from '../utils/ApiError';

interface PaginateOptions {
  sortBy?: string;
  limit?: number;
  page?: number;
}

interface QueryResult {
  results: ClinicShape[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

interface CreateClinicBody {
  name: string;
  address: string;
  contactPhone: string;
  contactEmail: string;
  timezone: string;
  subscriptionPlanId?: string | null;
}

interface UpdateClinicBody {
  name?: string;
  address?: string;
  contactPhone?: string;
  contactEmail?: string;
  timezone?: string;
  subscriptionPlanId?: string | null;
}

interface ClinicShape {
  id: string;
  name: string;
  address: string;
  contactPhone: string;
  contactEmail: string;
  timezone: string;
  subscriptionPlanId: string | null;
  status: ClinicStatus;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const clinicSelect = {
  id: true,
  name: true,
  address: true,
  contactPhone: true,
  contactEmail: true,
  timezone: true,
  subscriptionPlanId: true,
  status: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

const clinicWithPlanSelect = {
  ...clinicSelect,
  subscriptionPlan: {
    select: {
      id: true,
      name: true,
      tier: true,
      maxUsersByRole: true,
      maxSensoryRooms: true,
      maxActiveChildren: true,
      featureFlags: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} as const;

const createClinic = async (body: CreateClinicBody): Promise<ClinicShape> => {
  return prisma.clinic.create({
    data: {
      name: body.name,
      address: body.address,
      contactPhone: body.contactPhone,
      contactEmail: body.contactEmail,
      timezone: body.timezone,
      subscriptionPlanId: body.subscriptionPlanId ?? null,
    },
    select: clinicSelect,
  });
};

const queryClinics = async (options: PaginateOptions): Promise<QueryResult> => {
  const { sortBy, limit = 10, page = 1 } = options;
  const skip = (page - 1) * Number(limit);

  const orderBy: Record<string, 'asc' | 'desc'>[] = sortBy
    ? sortBy.split(',').map((criterion) => {
        const [field, order] = criterion.split(':');
        return { [field]: order === 'desc' ? 'desc' : 'asc' };
      })
    : [{ createdAt: 'asc' }];

  const where = { deletedAt: null };

  const [results, totalResults] = await Promise.all([
    prisma.clinic.findMany({ where, skip, take: Number(limit), orderBy, select: clinicSelect }),
    prisma.clinic.count({ where }),
  ]);

  return {
    results,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(totalResults / Number(limit)),
    totalResults,
  };
};

const getClinicById = async (clinicId: string): Promise<ClinicShape> => {
  const clinic = await prisma.clinic.findFirst({
    where: { id: clinicId, deletedAt: null },
    select: clinicSelect,
  });
  if (!clinic) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Clinic not found');
  }
  return clinic;
};

const updateClinic = async (clinicId: string, updateBody: UpdateClinicBody): Promise<ClinicShape> => {
  const clinic = await prisma.clinic.findFirst({ where: { id: clinicId, deletedAt: null } });
  if (!clinic) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Clinic not found');
  }
  return prisma.clinic.update({
    where: { id: clinicId },
    data: updateBody,
    select: clinicSelect,
  });
};

const suspendClinic = async (clinicId: string): Promise<ClinicShape> => {
  const clinic = await prisma.clinic.findFirst({ where: { id: clinicId, deletedAt: null } });
  if (!clinic) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Clinic not found');
  }
  return prisma.clinic.update({
    where: { id: clinicId },
    data: { status: 'suspended' },
    select: clinicSelect,
  });
};

const reactivateClinic = async (clinicId: string): Promise<ClinicShape> => {
  const clinic = await prisma.clinic.findFirst({ where: { id: clinicId, deletedAt: null } });
  if (!clinic) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Clinic not found');
  }
  return prisma.clinic.update({
    where: { id: clinicId },
    data: { status: 'active' },
    select: clinicSelect,
  });
};

const getMyClinic = async (tenantId: string): Promise<ClinicShape & { subscriptionPlan: Prisma.JsonValue | null }> => {
  if (!tenantId) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Clinic not found');
  }
  const clinic = await prisma.clinic.findFirst({
    where: { id: tenantId, deletedAt: null },
    select: clinicWithPlanSelect,
  });
  if (!clinic) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Clinic not found');
  }
  return clinic as ClinicShape & { subscriptionPlan: Prisma.JsonValue | null };
};

export const clinicService = {
  createClinic,
  queryClinics,
  getClinicById,
  updateClinic,
  suspendClinic,
  reactivateClinic,
  getMyClinic,
};
