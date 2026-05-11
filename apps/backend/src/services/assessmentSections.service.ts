import type { MilestoneRatingInput, SensoryRatingInput } from '@haber/shared';
import httpStatus from 'http-status';
import prisma from '../config/prisma';
import { ApiError } from '../utils/ApiError';

const verifyAccess = async (assessmentId: string, childId: string, tenantId: string, userId: string, role: string) => {
  const assessment = await prisma.assessment.findFirst({ where: { id: assessmentId, childId, tenantId } });
  if (!assessment) throw new ApiError(httpStatus.NOT_FOUND, 'Assessment not found');

  if (role !== 'clinic_admin') {
    const assignment = await prisma.childTherapist.findUnique({
      where: { childId_userId: { childId, userId } },
    });
    if (!assignment) throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
  }

  return assessment;
};

const upsertMilestones = async (
  childId: string,
  assessmentId: string,
  tenantId: string,
  userId: string,
  role: string,
  milestones: MilestoneRatingInput[]
) => {
  const assessment = await verifyAccess(assessmentId, childId, tenantId, userId, role);
  if (assessment.status !== 'draft') throw new ApiError(httpStatus.CONFLICT, 'ASSESSMENT_FINALISED');

  return prisma.$transaction(async (tx) => {
    await tx.assessmentMilestone.deleteMany({ where: { assessmentId } });
    await tx.assessmentMilestone.createMany({
      data: milestones.map((m) => ({
        assessmentId,
        milestoneId: m.milestoneId,
        achievedAtAgeMonths: m.achievedAtAgeMonths ?? null,
        delayed: m.delayed,
        notes: m.notes ?? null,
      })),
    });
    return tx.assessmentMilestone.findMany({ where: { assessmentId }, orderBy: { createdAt: 'asc' } });
  });
};

const getMilestones = async (childId: string, assessmentId: string, tenantId: string, userId: string, role: string) => {
  await verifyAccess(assessmentId, childId, tenantId, userId, role);
  return prisma.assessmentMilestone.findMany({ where: { assessmentId }, orderBy: { createdAt: 'asc' } });
};

const upsertSensoryProfile = async (
  childId: string,
  assessmentId: string,
  tenantId: string,
  userId: string,
  role: string,
  ratings: SensoryRatingInput[],
  sensoryObservations?: string | null
) => {
  const assessment = await verifyAccess(assessmentId, childId, tenantId, userId, role);
  if (assessment.status !== 'draft') throw new ApiError(httpStatus.CONFLICT, 'ASSESSMENT_FINALISED');

  return prisma.$transaction(async (tx) => {
    await tx.assessmentSensoryRating.deleteMany({ where: { assessmentId } });
    await tx.assessmentSensoryRating.createMany({
      data: ratings.map((r) => ({
        assessmentId,
        sensorySystemId: r.sensorySystemId,
        rating: r.rating,
        notes: r.notes ?? null,
      })),
    });
    await tx.assessment.update({
      where: { id: assessmentId },
      data: { sensoryObservations: sensoryObservations ?? null },
    });
    const savedRatings = await tx.assessmentSensoryRating.findMany({
      where: { assessmentId },
      orderBy: { createdAt: 'asc' },
    });
    const updated = await tx.assessment.findUniqueOrThrow({ where: { id: assessmentId } });
    return { ratings: savedRatings, sensoryObservations: updated.sensoryObservations };
  });
};

const getSensoryProfile = async (childId: string, assessmentId: string, tenantId: string, userId: string, role: string) => {
  await verifyAccess(assessmentId, childId, tenantId, userId, role);
  const [ratings, assessment] = await Promise.all([
    prisma.assessmentSensoryRating.findMany({ where: { assessmentId }, orderBy: { createdAt: 'asc' } }),
    prisma.assessment.findUniqueOrThrow({ where: { id: assessmentId } }),
  ]);
  return { ratings, sensoryObservations: assessment.sensoryObservations };
};

const upsertFunctionalConcerns = async (
  childId: string,
  assessmentId: string,
  tenantId: string,
  userId: string,
  role: string,
  functionalConcernIds: string[],
  clinicalObservations?: string | null
) => {
  const assessment = await verifyAccess(assessmentId, childId, tenantId, userId, role);
  if (assessment.status !== 'draft') throw new ApiError(httpStatus.CONFLICT, 'ASSESSMENT_FINALISED');

  return prisma.$transaction(async (tx) => {
    await tx.assessmentFunctionalConcern.deleteMany({ where: { assessmentId } });
    await tx.assessmentFunctionalConcern.createMany({
      data: functionalConcernIds.map((functionalConcernId) => ({ assessmentId, functionalConcernId })),
    });
    await tx.assessment.update({
      where: { id: assessmentId },
      data: { functionalConcernObservations: clinicalObservations ?? null },
    });
    const concerns = await tx.assessmentFunctionalConcern.findMany({ where: { assessmentId } });
    const updated = await tx.assessment.findUniqueOrThrow({ where: { id: assessmentId } });
    return { concerns, functionalConcernObservations: updated.functionalConcernObservations };
  });
};

const getFunctionalConcerns = async (
  childId: string,
  assessmentId: string,
  tenantId: string,
  userId: string,
  role: string
) => {
  await verifyAccess(assessmentId, childId, tenantId, userId, role);
  const [concerns, assessment] = await Promise.all([
    prisma.assessmentFunctionalConcern.findMany({ where: { assessmentId } }),
    prisma.assessment.findUniqueOrThrow({ where: { id: assessmentId } }),
  ]);
  return { concerns, functionalConcernObservations: assessment.functionalConcernObservations };
};

export const assessmentSectionsService = {
  upsertMilestones,
  getMilestones,
  upsertSensoryProfile,
  getSensoryProfile,
  upsertFunctionalConcerns,
  getFunctionalConcerns,
};
