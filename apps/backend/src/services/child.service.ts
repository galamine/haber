import type {
  ChildDto,
  CreateChildDto,
  CreateGuardianDto,
  GuardianDto,
  IntakeStatusDto,
  UpdateChildDto,
  UpdateGuardianDto,
  UpsertMedicalHistoryDto,
} from '@haber/shared';
import httpStatus from 'http-status';
import prisma from '../config/prisma';
import { ApiError } from '../utils/ApiError';

interface PaginateOptions {
  sortBy?: string;
  limit?: number;
  page?: number;
}

interface ChildFilter {
  name?: string;
  opNumber?: string;
  includeDeleted?: boolean;
}

interface ChildResult {
  results: ChildDto[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

const childSelect = {
  id: true,
  tenantId: true,
  childCode: true,
  opNumber: true,
  fullName: true,
  dob: true,
  sex: true,
  photoUrl: true,
  spokenLanguages: true,
  school: true,
  preferredTherapistId: true,
  heightCm: true,
  weightKg: true,
  measurementDate: true,
  latestPlanId: true,
  intakeComplete: true,
  assignedTherapists: {
    select: { userId: true },
  },
  createdAt: true,
  updatedAt: true,
} as const;

const transformChild = (child: Record<string, unknown>): ChildDto => {
  const assignedTherapists = (child.assignedTherapists as Array<{ userId: string }>) ?? [];
  const spokenLanguages = (child.spokenLanguages as string[]) ?? [];
  const heightCm = (child.heightCm as { toNumber: () => number } | null)?.toNumber() ?? null;
  const weightKg = (child.weightKg as { toNumber: () => number } | null)?.toNumber() ?? null;

  return {
    id: child.id as string,
    tenantId: child.tenantId as string,
    childCode: child.childCode as string,
    opNumber: child.opNumber as string | null,
    fullName: child.fullName as string,
    dob: (child.dob as Date).toISOString(),
    sex: child.sex as 'male' | 'female' | 'other',
    photoUrl: child.photoUrl as string | null,
    spokenLanguages,
    school: child.school as string | null,
    preferredTherapistId: child.preferredTherapistId as string | null,
    heightCm,
    weightKg,
    measurementDate: child.measurementDate ? (child.measurementDate as Date).toISOString() : null,
    latestPlanId: child.latestPlanId as string | null,
    intakeComplete: child.intakeComplete as boolean,
    assignedTherapistIds: assignedTherapists.map((t) => t.userId),
    createdAt: (child.createdAt as Date).toISOString(),
    updatedAt: (child.updatedAt as Date).toISOString(),
  };
};

const transformGuardian = (guardian: Record<string, unknown>): GuardianDto => ({
  id: guardian.id as string,
  childId: guardian.childId as string,
  fullName: guardian.fullName as string,
  relationship: guardian.relationship as string,
  phone: guardian.phone as string,
  email: guardian.email as string | null,
  loginEnabled: guardian.loginEnabled as boolean,
  createdAt: (guardian.createdAt as Date).toISOString(),
});

const evaluateIntakeComplete = async (
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  childId: string
): Promise<boolean> => {
  const guardianCount = await tx.guardian.count({ where: { childId, deletedAt: null } });
  const medHistory = await tx.medicalHistory.findUnique({ where: { childId } });
  const child = await tx.child.findUnique({
    where: { id: childId },
    select: { heightCm: true, weightKg: true, measurementDate: true },
  });

  const complete =
    guardianCount > 0 &&
    medHistory !== null &&
    child?.heightCm !== null &&
    child?.weightKg !== null &&
    child?.measurementDate !== null;

  await tx.child.update({ where: { id: childId }, data: { intakeComplete: complete } });
  return complete;
};

const evaluateConsentStatus = async (
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  childId: string
): Promise<'all_consented' | 'partial' | 'none' | 'withdrawn'> => {
  const guardians = await tx.guardian.findMany({ where: { childId, deletedAt: null } });
  if (guardians.length === 0) {
    await tx.child.update({ where: { id: childId }, data: { consentStatus: 'none' } });
    return 'none';
  }

  const activeRecords = await tx.consentRecord.findMany({ where: { childId, status: 'active' } });
  const withdrawnRecords = await tx.consentRecord.findMany({ where: { childId, status: 'withdrawn' } });

  const activeSet = new Set(activeRecords.map((r) => `${r.guardianId}:${r.type}`));

  const hasUnresolvedWithdrawal = withdrawnRecords.some((r) => !activeSet.has(`${r.guardianId}:${r.type}`));
  if (hasUnresolvedWithdrawal) {
    await tx.child.update({ where: { id: childId }, data: { consentStatus: 'withdrawn' } });
    return 'withdrawn';
  }

  const allConsented = guardians.every((g) =>
    (['treatment', 'data_processing'] as const).every((type) => activeSet.has(`${g.id}:${type}`))
  );
  if (allConsented) {
    await tx.child.update({ where: { id: childId }, data: { consentStatus: 'all_consented' } });
    return 'all_consented';
  }

  const status = activeRecords.length > 0 ? 'partial' : 'none';
  await tx.child.update({ where: { id: childId }, data: { consentStatus: status } });
  return status;
};

const createChild = async (_callerId: string, tenantId: string, body: CreateChildDto): Promise<ChildDto> => {
  return prisma.$transaction(async (tx) => {
    const latestChild = await tx.child.findFirst({
      where: { tenantId },
      orderBy: { childCode: 'desc' },
      select: { childCode: true },
    });

    const lastNumber = latestChild ? parseInt(latestChild.childCode.split('-')[1], 10) : 0;
    const childCode = `CHD-${String(lastNumber + 1).padStart(4, '0')}`;

    const { assignedTherapistIds, ...demographics } = body;
    const dob = new Date(body.dob);

    const child = await tx.child.create({
      data: {
        ...demographics,
        dob,
        tenantId,
        childCode,
        intakeComplete: false,
      },
    });

    if (assignedTherapistIds && assignedTherapistIds.length > 0) {
      await tx.childTherapist.createMany({
        data: assignedTherapistIds.map((userId) => ({ childId: child.id, userId })),
      });
    }

    const fullChild = await tx.child.findUnique({
      where: { id: child.id },
      select: childSelect,
    });

    return transformChild(fullChild as unknown as Record<string, unknown>);
  });
};

const queryChildren = async (
  callerId: string,
  callerRole: string,
  tenantId: string,
  filter: ChildFilter,
  options: PaginateOptions
): Promise<ChildResult> => {
  const { sortBy, limit = 10, page = 1 } = options;
  const skip = (page - 1) * Number(limit);

  const orderBy: Record<string, 'asc' | 'desc'>[] = sortBy
    ? sortBy.split(',').map((criterion) => {
        const [field, order] = criterion.split(':');
        return { [field]: order === 'desc' ? 'desc' : 'asc' };
      })
    : [{ createdAt: 'asc' }];

  const where: Record<string, unknown> = { tenantId };

  if (callerRole === 'therapist') {
    where.deletedAt = null;
    where.assignedTherapists = { some: { userId: callerId } };
  } else if (callerRole === 'super_admin' && filter.includeDeleted) {
  } else {
    where.deletedAt = null;
  }

  if (filter.name) {
    where.fullName = { contains: String(filter.name), mode: 'insensitive' };
  }
  if (filter.opNumber) {
    where.opNumber = { contains: filter.opNumber, mode: 'insensitive' };
  }

  const [results, totalResults] = await Promise.all([
    prisma.child.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy,
      select: childSelect,
    }),
    prisma.child.count({ where }),
  ]);

  return {
    results: results.map((c) => transformChild(c as unknown as Record<string, unknown>)),
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(totalResults / Number(limit)),
    totalResults,
  };
};

const getChildById = async (callerId: string, callerRole: string, tenantId: string, childId: string): Promise<ChildDto> => {
  const child = await prisma.child.findFirst({
    where: { tenantId, id: childId, deletedAt: null },
    select: childSelect,
  });

  if (!child) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Child not found');
  }

  if (callerRole === 'therapist') {
    const assignment = await prisma.childTherapist.findUnique({
      where: { childId_userId: { childId, userId: callerId } },
    });
    if (!assignment) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Not authorized to access this child');
    }
  }

  return transformChild(child as unknown as Record<string, unknown>);
};

const updateChild = async (tenantId: string, childId: string, body: UpdateChildDto): Promise<ChildDto> => {
  const existing = await prisma.child.findFirst({
    where: { id: childId, tenantId, deletedAt: null },
    select: { id: true, tenantId: true },
  });

  if (!existing) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Child not found');
  }

  if (body.preferredTherapistId) {
    const therapist = await prisma.user.findFirst({
      where: { id: body.preferredTherapistId, tenantId },
      select: { id: true },
    });
    if (!therapist) {
      throw new ApiError(422, 'Therapist does not belong to this clinic');
    }
  }

  return prisma.$transaction(async (tx) => {
    if (body.assignedTherapistIds !== undefined) {
      await tx.childTherapist.deleteMany({ where: { childId } });
      if (body.assignedTherapistIds.length > 0) {
        await tx.childTherapist.createMany({
          data: body.assignedTherapistIds.map((userId) => ({ childId, userId })),
        });
      }
    }

    const { assignedTherapistIds, ...rest } = body;
    const data: Record<string, unknown> = { ...rest };

    if (body.dob) {
      data.dob = new Date(body.dob);
    }
    if (body.measurementDate) {
      data.measurementDate = new Date(body.measurementDate);
    }

    if (Object.keys(data).length > 0) {
      await tx.child.update({ where: { id: childId }, data });
    }

    await evaluateIntakeComplete(tx, childId);

    const updated = await tx.child.findUnique({
      where: { id: childId },
      select: childSelect,
    });

    return transformChild(updated as unknown as Record<string, unknown>);
  });
};

const upsertMedicalHistory = async (tenantId: string, childId: string, body: UpsertMedicalHistoryDto): Promise<ChildDto> => {
  const child = await prisma.child.findFirst({
    where: { id: childId, tenantId, deletedAt: null },
    select: { id: true, tenantId: true },
  });

  if (!child) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Child not found');
  }

  await prisma.$transaction(async (tx) => {
    await tx.medicalHistory.upsert({
      where: { childId },
      create: { childId, ...body },
      update: body,
    });

    await evaluateIntakeComplete(tx, childId);
  });

  const updated = await prisma.child.findUnique({
    where: { id: childId },
    select: childSelect,
  });

  return transformChild(updated as unknown as Record<string, unknown>);
};

const createGuardian = async (tenantId: string, childId: string, body: CreateGuardianDto): Promise<GuardianDto> => {
  const child = await prisma.child.findFirst({
    where: { id: childId, tenantId, deletedAt: null },
    select: { id: true, tenantId: true },
  });

  if (!child) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Child not found');
  }

  const guardian = await prisma.guardian.create({
    data: { childId, ...body },
  });

  await prisma.$transaction(async (tx) => {
    await evaluateIntakeComplete(tx, childId);
  });

  return transformGuardian(guardian as unknown as Record<string, unknown>);
};

const updateGuardian = async (
  tenantId: string,
  childId: string,
  guardianId: string,
  body: UpdateGuardianDto
): Promise<GuardianDto> => {
  const guardian = await prisma.guardian.findFirst({
    where: { id: guardianId, childId },
    include: { child: { select: { tenantId: true } } },
  });

  if (!guardian || guardian.child.tenantId !== tenantId) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Guardian not found');
  }

  const updated = await prisma.guardian.update({
    where: { id: guardianId },
    data: body,
  });

  return transformGuardian(updated as unknown as Record<string, unknown>);
};

const getIntakeStatus = async (tenantId: string, childId: string): Promise<IntakeStatusDto> => {
  const child = await prisma.child.findFirst({
    where: { id: childId, tenantId, deletedAt: null },
    select: {
      id: true,
      intakeComplete: true,
      heightCm: true,
      weightKg: true,
      measurementDate: true,
      guardians: { where: { deletedAt: null }, select: { id: true } },
      medicalHistory: { select: { id: true } },
    },
  });

  if (!child) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Child not found');
  }

  const missingFields: string[] = [];

  if (child.guardians.length === 0) {
    missingFields.push('guardian');
  }
  if (!child.medicalHistory) {
    missingFields.push('medicalHistory');
  }
  if (child.heightCm === null || child.weightKg === null || child.measurementDate === null) {
    missingFields.push('anthropometrics');
  }

  return {
    intakeComplete: missingFields.length === 0,
    missingFields,
  };
};

const softDeleteChild = async (tenantId: string, childId: string, callerRole: string): Promise<void> => {
  if (!['clinic_admin', 'super_admin'].includes(callerRole)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Not authorized to delete children');
  }

  const child = await prisma.child.findFirst({
    where: { id: childId, tenantId, deletedAt: null },
    select: { id: true, tenantId: true },
  });

  if (!child) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Child not found');
  }

  await prisma.child.update({
    where: { id: childId },
    data: { deletedAt: new Date() },
  });
};

export const childService = {
  createChild,
  queryChildren,
  getChildById,
  updateChild,
  upsertMedicalHistory,
  createGuardian,
  updateGuardian,
  getIntakeStatus,
  softDeleteChild,
  evaluateConsentStatus,
};
