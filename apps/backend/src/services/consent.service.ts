import type { ConsentRecordDto, ConsentStatusDto } from '@haber/shared';
import type { ConsentType, Prisma } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { childService } from './child.service';
import { emailService } from './email.service';

const transformConsentRecord = (record: Record<string, unknown>): ConsentRecordDto => ({
  id: record.id as string,
  guardianId: record.guardianId as string,
  childId: record.childId as string,
  type: record.type as ConsentType,
  typedName: record.typedName as string,
  checkedAt: (record.checkedAt as Date).toISOString(),
  ipAddress: record.ipAddress as string,
  status: record.status as 'active' | 'withdrawn',
  withdrawnAt: record.withdrawnAt ? (record.withdrawnAt as Date).toISOString() : null,
  withdrawnReason: record.withdrawnReason as string | null,
  createdAt: (record.createdAt as Date).toISOString(),
});

const captureConsent = async (
  childId: string,
  guardianId: string,
  type: ConsentType,
  typedName: string,
  ipAddress: string,
  checkedAt: Date,
  tenantId: string
): Promise<ConsentRecordDto> => {
  const child = await prisma.child.findFirst({
    where: { id: childId, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!child) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Child not found');
  }

  const guardian = await prisma.guardian.findFirst({
    where: { id: guardianId, childId, deletedAt: null },
    select: { id: true },
  });
  if (!guardian) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Guardian does not belong to this child');
  }

  return prisma.$transaction(async (tx) => {
    const existingActive = await tx.consentRecord.findFirst({
      where: { guardianId, childId, type, status: 'active' },
    });

    let record: Prisma.ConsentRecordGetPayload<Record<string, never>>;
    if (existingActive) {
      record = await tx.consentRecord.update({
        where: { id: existingActive.id },
        data: { typedName, checkedAt, ipAddress },
      });
    } else {
      record = await tx.consentRecord.create({
        data: { guardianId, childId, type, typedName, checkedAt, ipAddress, status: 'active' },
      });
    }

    await childService.evaluateConsentStatus(tx, childId);
    return record;
  }) as Promise<ConsentRecordDto>;
};

const withdrawConsent = async (childId: string, consentId: string, reason: string, tenantId: string): Promise<void> => {
  const child = await prisma.child.findFirst({
    where: { id: childId, tenantId, deletedAt: null },
    select: { id: true, fullName: true },
  });
  if (!child) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Child not found');
  }

  const record = await prisma.consentRecord.findUnique({
    where: { id: consentId },
    include: { guardian: true, child: true },
  });

  if (!record || record.childId !== childId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
  }

  await prisma.$transaction(async (tx) => {
    await tx.consentRecord.update({
      where: { id: consentId },
      data: { status: 'withdrawn', withdrawnAt: new Date(), withdrawnReason: reason },
    });

    await childService.evaluateConsentStatus(tx, childId);
  });

  const assignedTherapists = await prisma.childTherapist.findMany({
    where: { childId },
    include: { user: { select: { email: true } } },
  });

  const therapistEmails = assignedTherapists.map((t) => t.user.email).filter((email): email is string => email !== null);

  const clinicAdmins = await prisma.user.findMany({
    where: { tenantId, role: 'clinic_admin', isActive: true },
    select: { email: true },
  });
  const adminEmails = clinicAdmins.map((a) => a.email).filter((email): email is string => email !== null);

  const allRecipients = [...therapistEmails, ...adminEmails];
  if (allRecipients.length > 0) {
    await emailService.sendConsentWithdrawnEmail(allRecipients, child.fullName, record.guardian.fullName, record.type);
  }
};

const getConsentStatus = async (childId: string, tenantId: string): Promise<ConsentStatusDto> => {
  const child = await prisma.child.findFirst({
    where: { id: childId, tenantId, deletedAt: null },
    select: { id: true, consentStatus: true },
  });

  if (!child) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Child not found');
  }

  const guardians = await prisma.guardian.findMany({
    where: { childId, deletedAt: null },
    select: { id: true, fullName: true },
  });

  const activeRecords = await prisma.consentRecord.findMany({
    where: { childId, status: 'active' },
    select: { guardianId: true, type: true, checkedAt: true, status: true },
  });

  const guardianConsentMap: Record<
    string,
    {
      guardianId: string;
      guardianName: string;
      consents: Array<{ type: ConsentType; status: 'active' | 'withdrawn'; checkedAt: string | null }>;
    }
  > = {};

  for (const g of guardians) {
    guardianConsentMap[g.id] = { guardianId: g.id, guardianName: g.fullName, consents: [] };
  }

  for (const r of activeRecords) {
    if (guardianConsentMap[r.guardianId]) {
      guardianConsentMap[r.guardianId].consents.push({
        type: r.type as ConsentType,
        status: r.status as 'active' | 'withdrawn',
        checkedAt: r.checkedAt ? r.checkedAt.toISOString() : null,
      });
    }
  }

  return {
    allConsented: child.consentStatus === 'all_consented',
    consentStatus: child.consentStatus as 'all_consented' | 'partial' | 'none' | 'withdrawn',
    guardians: Object.values(guardianConsentMap),
  };
};

const getConsentHistory = async (childId: string, tenantId: string): Promise<ConsentRecordDto[]> => {
  const child = await prisma.child.findFirst({
    where: { id: childId, tenantId, deletedAt: null },
    select: { id: true },
  });

  if (!child) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Child not found');
  }

  const records = await prisma.consentRecord.findMany({
    where: { childId },
    orderBy: { createdAt: 'desc' },
  });

  return records.map((r) => transformConsentRecord(r as unknown as Record<string, unknown>));
};

export const consentService = {
  captureConsent,
  withdrawConsent,
  getConsentStatus,
  getConsentHistory,
};
