import type { SignDto, ToolResultInput, UpsertInterventionPlanDto } from '@haber/shared';
import type { InterventionSetting } from '@prisma/client';
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

const upsertToolResults = async (
  childId: string,
  assessmentId: string,
  tenantId: string,
  userId: string,
  role: string,
  toolResults: ToolResultInput[],
  overallScoresSummary?: string | null
) => {
  const assessment = await verifyAccess(assessmentId, childId, tenantId, userId, role);
  if (assessment.status !== 'draft') throw new ApiError(httpStatus.CONFLICT, 'ASSESSMENT_FINALISED');

  return prisma.$transaction(async (tx) => {
    await tx.assessmentToolResult.deleteMany({ where: { assessmentId } });
    await tx.assessmentToolResult.createMany({
      data: toolResults.map((tr) => ({
        assessmentId,
        assessmentToolId: tr.assessmentToolId,
        scoresSummary: tr.scoresSummary ?? null,
      })),
    });
    await tx.assessment.update({
      where: { id: assessmentId },
      data: { overallScoresSummary: overallScoresSummary ?? null },
    });
    return tx.assessmentToolResult.findMany({ where: { assessmentId }, orderBy: { createdAt: 'asc' } });
  });
};

const getToolResults = async (childId: string, assessmentId: string, tenantId: string, userId: string, role: string) => {
  await verifyAccess(assessmentId, childId, tenantId, userId, role);
  return prisma.assessmentToolResult.findMany({ where: { assessmentId }, orderBy: { createdAt: 'asc' } });
};

const upsertInterventionPlan = async (
  childId: string,
  assessmentId: string,
  tenantId: string,
  userId: string,
  role: string,
  data: UpsertInterventionPlanDto
) => {
  const assessment = await verifyAccess(assessmentId, childId, tenantId, userId, role);
  if (assessment.status !== 'draft') throw new ApiError(httpStatus.CONFLICT, 'ASSESSMENT_FINALISED');

  return prisma.$transaction(async (tx) => {
    const plan = await tx.assessmentInterventionPlan.upsert({
      where: { assessmentId },
      create: {
        assessmentId,
        frequencyPerWeek: data.frequencyPerWeek,
        sessionDurationMinutes: data.sessionDurationMinutes,
        interventionSetting: data.interventionSetting as InterventionSetting,
        reviewPeriodWeeks: data.reviewPeriodWeeks,
        homeProgramRecommendations: data.homeProgramRecommendations ?? null,
        referralsToSpecialists: data.referralsToSpecialists ?? null,
        shortTermGoals: data.shortTermGoals,
        longTermGoals: data.longTermGoals,
      },
      update: {
        frequencyPerWeek: data.frequencyPerWeek,
        sessionDurationMinutes: data.sessionDurationMinutes,
        interventionSetting: data.interventionSetting as InterventionSetting,
        reviewPeriodWeeks: data.reviewPeriodWeeks,
        homeProgramRecommendations: data.homeProgramRecommendations ?? null,
        referralsToSpecialists: data.referralsToSpecialists ?? null,
        shortTermGoals: data.shortTermGoals,
        longTermGoals: data.longTermGoals,
      },
    });
    return plan;
  });
};

const getInterventionPlan = async (
  childId: string,
  assessmentId: string,
  tenantId: string,
  userId: string,
  role: string
) => {
  await verifyAccess(assessmentId, childId, tenantId, userId, role);
  const plan = await prisma.assessmentInterventionPlan.findUnique({ where: { assessmentId } });
  if (!plan) throw new ApiError(httpStatus.NOT_FOUND, 'INTERVENTION_PLAN_NOT_FOUND');
  return plan;
};

const signAssessment = async (
  childId: string,
  assessmentId: string,
  tenantId: string,
  userId: string,
  role: string,
  data: SignDto,
  ipAddress: string
) => {
  await verifyAccess(assessmentId, childId, tenantId, userId, role);

  if (data.signatoryType === 'therapist') {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, 'User not found');

    return prisma.assessmentSignature.upsert({
      where: { assessmentId_signatoryType: { assessmentId, signatoryType: 'therapist' } },
      create: {
        assessmentId,
        signatoryType: 'therapist',
        typedName: data.typedName,
        credentials: data.credentials ?? user.credentialsQualifications ?? null,
        timestamp: new Date(),
        ipAddress,
        consentCheckbox: null,
      },
      update: {
        typedName: data.typedName,
        credentials: data.credentials ?? user.credentialsQualifications ?? null,
        timestamp: new Date(),
        ipAddress,
      },
    });
  } else {
    if (!data.consentCheckbox) throw new ApiError(httpStatus.BAD_REQUEST, 'CONSENT_CHECKBOX_REQUIRED');

    return prisma.assessmentSignature.upsert({
      where: { assessmentId_signatoryType: { assessmentId, signatoryType: 'guardian' } },
      create: {
        assessmentId,
        signatoryType: 'guardian',
        typedName: data.typedName,
        credentials: null,
        timestamp: new Date(),
        ipAddress,
        consentCheckbox: data.consentCheckbox,
      },
      update: {
        typedName: data.typedName,
        timestamp: new Date(),
        ipAddress,
        consentCheckbox: data.consentCheckbox,
      },
    });
  }
};

const getSignatures = async (childId: string, assessmentId: string, tenantId: string, userId: string, role: string) => {
  await verifyAccess(assessmentId, childId, tenantId, userId, role);
  return prisma.assessmentSignature.findMany({ where: { assessmentId } });
};

export const assessmentFinalSectionsService = {
  upsertToolResults,
  getToolResults,
  upsertInterventionPlan,
  getInterventionPlan,
  signAssessment,
  getSignatures,
};
