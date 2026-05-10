import { randomInt } from 'node:crypto';
import type { InviteStaffDto, UpdateStaffDto } from '@haber/shared';
import bcrypt from 'bcrypt';
import httpStatus from 'http-status';
import moment from 'moment';
import prisma from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { emailService } from './email.service';

interface PaginateOptions {
  sortBy?: string;
  limit?: number;
  page?: number;
}

interface QueryResult {
  results: StaffShape[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

interface StaffShape {
  id: string;
  name: string;
  email: string;
  role: 'therapist' | 'staff';
  isActive: boolean;
  permissions: string[];
  departmentIds: string[];
  invitedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface StaffFilter {
  name?: string;
  role?: 'therapist' | 'staff';
  isActive?: boolean;
}

const OTP_EXPIRY_MINUTES = 10;

const generateOtp = (): string => randomInt(100000, 999999).toString();

const staffSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  departmentIds: true,
  invitedByUserId: true,
  staffPermission: {
    select: {
      permissions: true,
    },
  },
  createdAt: true,
  updatedAt: true,
} as const;

const transformStaff = (staff: Record<string, unknown>): StaffShape => ({
  id: staff.id as string,
  name: staff.name as string,
  email: staff.email as string,
  role: staff.role as 'therapist' | 'staff',
  isActive: staff.isActive as boolean,
  permissions: (staff.staffPermission as { permissions: string[] } | null)?.permissions ?? [],
  departmentIds: staff.departmentIds as string[],
  invitedByUserId: staff.invitedByUserId as string | null,
  createdAt: staff.createdAt as Date,
  updatedAt: staff.updatedAt as Date,
});

const inviteStaff = async (inviterId: string, tenantId: string, body: InviteStaffDto): Promise<void> => {
  const clinic = await prisma.clinic.findFirst({
    where: { id: tenantId, deletedAt: null },
    select: {
      name: true,
      subscriptionPlan: {
        select: {
          maxUsersByRole: true,
        },
      },
    },
  });

  if (!clinic) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Clinic not found');
  }

  await prisma.$transaction(async (tx) => {
    const count = await tx.user.count({ where: { tenantId, role: body.role } });
    const limit = (clinic.subscriptionPlan?.maxUsersByRole as Record<string, number> | null)?.[body.role] ?? null;
    if (limit !== null && count >= limit) {
      throw new ApiError(422, 'PLAN_LIMIT_EXCEEDED');
    }

    const existingUser = await tx.user.findUnique({ where: { email: body.email } });
    if (existingUser) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'User with this email already exists');
    }

    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);

    const user = await tx.user.create({
      data: {
        name: body.email.split('@')[0],
        email: body.email,
        role: body.role,
        tenantId,
        isActive: false,
        invitedByUserId: inviterId,
        departmentIds: body.departmentIds,
      },
    });

    await tx.otpRecord.create({
      data: {
        userId: user.id,
        hashedOtp,
        expiresAt: moment().add(OTP_EXPIRY_MINUTES, 'minutes').toDate(),
        type: 'invite',
      },
    });

    await tx.staffPermission.create({
      data: {
        userId: user.id,
        permissions: body.permissions,
      },
    });

    await emailService.sendInviteEmail(body.email, clinic.name, body.role, otp);
  });
};

const queryStaff = async (tenantId: string, filter: StaffFilter, options: PaginateOptions): Promise<QueryResult> => {
  const { sortBy, limit = 10, page = 1 } = options;
  const skip = (page - 1) * Number(limit);

  const orderBy: Record<string, 'asc' | 'desc'>[] = sortBy
    ? sortBy.split(',').map((criterion) => {
        const [field, order] = criterion.split(':');
        return { [field]: order === 'desc' ? 'desc' : 'asc' };
      })
    : [{ createdAt: 'asc' }];

  const where: Record<string, unknown> = { tenantId };
  if (filter.name) where.name = { contains: String(filter.name), mode: 'insensitive' };
  if (filter.role) where.role = filter.role;
  if (filter.isActive !== undefined) where.isActive = filter.isActive;

  const [results, totalResults] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy,
      select: staffSelect,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    results: results.map(transformStaff),
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(totalResults / Number(limit)),
    totalResults,
  };
};

const getStaffById = async (tenantId: string, userId: string): Promise<StaffShape> => {
  const staff = await prisma.user.findFirst({
    where: { id: userId, tenantId },
    select: staffSelect,
  });

  if (!staff) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Staff member not found');
  }

  return transformStaff(staff as unknown as Record<string, unknown>);
};

const updateStaff = async (tenantId: string, userId: string, body: UpdateStaffDto): Promise<StaffShape> => {
  const staff = await prisma.user.findFirst({
    where: { id: userId, tenantId },
    select: { id: true, tenantId: true },
  });

  if (!staff) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Staff member not found');
  }

  const updateData: Record<string, unknown> = {};
  if (body.departmentIds !== undefined) {
    updateData.departmentIds = body.departmentIds;
  }

  if (body.permissions !== undefined) {
    await prisma.staffPermission.upsert({
      where: { userId },
      create: { userId, permissions: body.permissions },
      update: { permissions: body.permissions },
    });
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
  }

  const updatedStaff = await prisma.user.findFirst({
    where: { id: userId, tenantId },
    select: staffSelect,
  });

  if (!updatedStaff) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Staff member not found');
  }

  return transformStaff(updatedStaff as unknown as Record<string, unknown>);
};

const deactivateStaff = async (tenantId: string, userId: string): Promise<StaffShape> => {
  const staff = await prisma.user.findFirst({
    where: { id: userId, tenantId },
    select: { id: true, tenantId: true, isActive: true },
  });

  if (!staff) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Staff member not found');
  }

  if (!staff.isActive) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Staff member is already deactivated');
  }

  const updatedStaff = await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
    select: staffSelect,
  });

  return transformStaff(updatedStaff as unknown as Record<string, unknown>);
};

const reactivateStaff = async (tenantId: string, userId: string): Promise<StaffShape> => {
  const staff = await prisma.user.findFirst({
    where: { id: userId, tenantId },
    select: { id: true, tenantId: true, isActive: true },
  });

  if (!staff) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Staff member not found');
  }

  if (staff.isActive) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Staff member is already active');
  }

  const updatedStaff = await prisma.user.update({
    where: { id: userId },
    data: { isActive: true },
    select: staffSelect,
  });

  return transformStaff(updatedStaff as unknown as Record<string, unknown>);
};

interface CapacityEntry {
  role: string;
  active: number;
  total: number;
  limit: number | null;
}

const getCapacity = async (tenantId: string): Promise<CapacityEntry[]> => {
  const clinic = await prisma.clinic.findFirst({
    where: { id: tenantId, deletedAt: null },
    select: {
      subscriptionPlan: {
        select: {
          maxUsersByRole: true,
        },
      },
    },
  });

  if (!clinic) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Clinic not found');
  }

  const limitByRole = (clinic.subscriptionPlan?.maxUsersByRole as Record<string, number> | null) ?? {};

  const roles: Array<'therapist' | 'staff'> = ['therapist', 'staff'];
  const capacity: CapacityEntry[] = [];

  for (const role of roles) {
    const [total, active] = await Promise.all([
      prisma.user.count({ where: { tenantId, role } }),
      prisma.user.count({ where: { tenantId, role, isActive: true } }),
    ]);

    capacity.push({
      role,
      active,
      total,
      limit: limitByRole[role] ?? null,
    });
  }

  return capacity;
};

export const staffService = {
  inviteStaff,
  queryStaff,
  getStaffById,
  updateStaff,
  deactivateStaff,
  reactivateStaff,
  getCapacity,
};
