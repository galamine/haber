import type { AssessmentCreatedDto, AssessmentDto, UpdateAssessmentDto } from '@haber/shared';
import type { AssessmentStatus } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../config/prisma';
import { ApiError } from '../utils/ApiError';

const transformAssessment = (a: Record<string, unknown>): AssessmentDto => ({
  id: a.id as string,
  childId: a.childId as string,
  tenantId: a.tenantId as string,
  version: a.version as number,
  status: a.status as AssessmentStatus,
  assessmentDate: (a.assessmentDate as Date).toISOString().split('T')[0],
  assessmentLocation: a.assessmentLocation as string | null,
  referringDoctor: a.referringDoctor as string | null,
  referralSource: a.referralSource as string | null,
  chiefComplaint: a.chiefComplaint as string | null,
  chiefComplaintTags: (a.chiefComplaintTags as string[]) ?? [],
  observations: a.observations as string | null,
  findings: (a.findings as Record<string, { notes: string }>) ?? {},
  notes: a.notes as string | null,
  primaryDiagnosisIds: (a.primaryDiagnosisIds as string[]) ?? [],
  medicalHistorySnapshot: a.medicalHistorySnapshot as Record<string, unknown> | null,
  recordedByUserId: a.recordedByUserId as string,
  createdAt: (a.createdAt as Date).toISOString(),
  updatedAt: (a.updatedAt as Date).toISOString(),
});

const verifyAssignment = async (childId: string, userId: string, role: string) => {
  if (role === 'clinic_admin') return;
  const assignment = await prisma.childTherapist.findUnique({
    where: { childId_userId: { childId, userId } },
  });
  if (!assignment) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
  }
};

const createAssessment = async (
  childId: string,
  tenantId: string,
  callerId: string,
  callerRole: string,
  assessmentDate: string
): Promise<AssessmentCreatedDto> => {
  const child = await prisma.child.findFirst({
    where: { id: childId, tenantId, deletedAt: null },
    include: { medicalHistory: true },
  });
  if (!child) throw new ApiError(httpStatus.NOT_FOUND, 'Child not found');
  if (!child.intakeComplete) throw new ApiError(422, 'INTAKE_INCOMPLETE');
  if (child.consentStatus !== 'all_consented') throw new ApiError(422, 'CONSENT_REQUIRED');

  await verifyAssignment(childId, callerId, callerRole);

  return prisma.$transaction(async (tx) => {
    const existingDraft = await tx.assessment.findFirst({ where: { childId, status: 'draft' } });
    if (existingDraft) throw new ApiError(httpStatus.CONFLICT, 'DRAFT_EXISTS');

    const agg = await tx.assessment.aggregate({ where: { childId }, _max: { version: true } });
    const newVersion = (agg._max.version ?? 0) + 1;

    const snapshot = child.medicalHistory
      ? {
          birthTerm: child.medicalHistory.birthTerm,
          birthComplications: child.medicalHistory.birthComplications,
          neonatalHistory: child.medicalHistory.neonatalHistory,
          gestationalAgeWeeks: child.medicalHistory.gestationalAgeWeeks,
          immunizations: child.medicalHistory.immunizations,
          allergies: child.medicalHistory.allergies,
          currentMedications: child.medicalHistory.currentMedications,
          priorDiagnoses: child.medicalHistory.priorDiagnoses,
          familyHistory: child.medicalHistory.familyHistory,
          sensorySensitivities: child.medicalHistory.sensorySensitivities,
          prenatalHistory: child.medicalHistory.prenatalHistory,
          previousTherapies: child.medicalHistory.previousTherapies,
        }
      : null;

    const assessment = await tx.assessment.create({
      data: {
        childId,
        tenantId,
        version: newVersion,
        status: 'draft',
        assessmentDate: new Date(assessmentDate),
        recordedByUserId: callerId,
        medicalHistorySnapshot: snapshot ?? undefined,
      },
    });

    return { id: assessment.id, version: assessment.version, status: assessment.status };
  });
};

const listAssessments = async (childId: string, tenantId: string, callerId: string, callerRole: string) => {
  const child = await prisma.child.findFirst({ where: { id: childId, tenantId, deletedAt: null }, select: { id: true } });
  if (!child) throw new ApiError(httpStatus.NOT_FOUND, 'Child not found');

  await verifyAssignment(childId, callerId, callerRole);

  const assessments = await prisma.assessment.findMany({
    where: { childId, tenantId },
    orderBy: { version: 'desc' },
  });
  return assessments.map((a) => transformAssessment(a as unknown as Record<string, unknown>));
};

const getAssessment = async (
  childId: string,
  assessmentId: string,
  tenantId: string,
  callerId: string,
  callerRole: string
) => {
  const assessment = await prisma.assessment.findFirst({
    where: { id: assessmentId, childId, tenantId },
  });
  if (!assessment) throw new ApiError(httpStatus.NOT_FOUND, 'Assessment not found');

  await verifyAssignment(childId, callerId, callerRole);

  return transformAssessment(assessment as unknown as Record<string, unknown>);
};

const updateAssessment = async (
  childId: string,
  assessmentId: string,
  tenantId: string,
  callerId: string,
  callerRole: string,
  body: UpdateAssessmentDto
) => {
  const assessment = await prisma.assessment.findFirst({ where: { id: assessmentId, childId, tenantId } });
  if (!assessment) throw new ApiError(httpStatus.NOT_FOUND, 'Assessment not found');
  if (assessment.status !== 'draft') throw new ApiError(httpStatus.CONFLICT, 'ASSESSMENT_FINALISED');

  await verifyAssignment(childId, callerId, callerRole);

  const updateData: Record<string, unknown> = {};
  if (body.assessmentDate !== undefined) updateData.assessmentDate = new Date(body.assessmentDate);
  if (body.assessmentLocation !== undefined) updateData.assessmentLocation = body.assessmentLocation;
  if (body.referringDoctor !== undefined) updateData.referringDoctor = body.referringDoctor;
  if (body.referralSource !== undefined) updateData.referralSource = body.referralSource;
  if (body.chiefComplaint !== undefined) updateData.chiefComplaint = body.chiefComplaint;
  if (body.chiefComplaintTags !== undefined) updateData.chiefComplaintTags = body.chiefComplaintTags;
  if (body.observations !== undefined) updateData.observations = body.observations;
  if (body.findings !== undefined) updateData.findings = body.findings;
  if (body.notes !== undefined) updateData.notes = body.notes;
  if (body.primaryDiagnosisIds !== undefined) updateData.primaryDiagnosisIds = body.primaryDiagnosisIds;
  if (body.medicalHistorySnapshot !== undefined) updateData.medicalHistorySnapshot = body.medicalHistorySnapshot;

  const updated = await prisma.assessment.update({ where: { id: assessmentId }, data: updateData });
  return transformAssessment(updated as unknown as Record<string, unknown>);
};

const finaliseAssessment = async (
  childId: string,
  assessmentId: string,
  tenantId: string,
  callerId: string,
  callerRole: string
) => {
  const assessment = await prisma.assessment.findFirst({ where: { id: assessmentId, childId, tenantId } });
  if (!assessment) throw new ApiError(httpStatus.NOT_FOUND, 'Assessment not found');
  if (assessment.status !== 'draft') throw new ApiError(httpStatus.CONFLICT, 'ASSESSMENT_FINALISED');

  await verifyAssignment(childId, callerId, callerRole);

  const updated = await prisma.assessment.update({ where: { id: assessmentId }, data: { status: 'finalised' } });
  return transformAssessment(updated as unknown as Record<string, unknown>);
};

export const assessmentService = {
  createAssessment,
  listAssessments,
  getAssessment,
  updateAssessment,
  finaliseAssessment,
};
