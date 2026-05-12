import { z } from 'zod';

export const AssessmentStatusEnum = z.enum(['draft', 'finalised']);
export type AssessmentStatus = z.infer<typeof AssessmentStatusEnum>;

export const FindingsEntrySchema = z.object({ notes: z.string() });

export const CreateAssessmentDtoSchema = z.object({
  assessmentDate: z.string().date(),
});

export const UpdateAssessmentDtoSchema = z
  .object({
    assessmentDate: z.string().date().optional(),
    assessmentLocation: z.string().nullable().optional(),
    referringDoctor: z.string().nullable().optional(),
    referralSource: z.string().nullable().optional(),
    chiefComplaint: z.string().nullable().optional(),
    chiefComplaintTags: z.array(z.string().uuid()).optional(),
    observations: z.string().nullable().optional(),
    findings: z.record(z.string().uuid(), FindingsEntrySchema).optional(),
    notes: z.string().nullable().optional(),
    primaryDiagnosisIds: z.array(z.string().uuid()).optional(),
    medicalHistorySnapshot: z.record(z.unknown()).nullable().optional(),
    overallScoresSummary: z.string().nullable().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, 'At least one field is required');

export const SignaturesStatusSchema = z.object({
  therapist: z.boolean(),
  guardian: z.boolean(),
});

export const AssessmentDtoSchema = z.object({
  id: z.string().uuid(),
  childId: z.string().uuid(),
  tenantId: z.string().uuid(),
  version: z.number().int().positive(),
  status: AssessmentStatusEnum,
  assessmentDate: z.string(),
  assessmentLocation: z.string().nullable(),
  referringDoctor: z.string().nullable(),
  referralSource: z.string().nullable(),
  chiefComplaint: z.string().nullable(),
  chiefComplaintTags: z.array(z.string().uuid()),
  observations: z.string().nullable(),
  findings: z.record(z.string().uuid(), FindingsEntrySchema),
  notes: z.string().nullable(),
  primaryDiagnosisIds: z.array(z.string().uuid()),
  medicalHistorySnapshot: z.record(z.unknown()).nullable(),
  overallScoresSummary: z.string().nullable(),
  recordedByUserId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  signaturesStatus: SignaturesStatusSchema.nullable(),
});

export const AssessmentCreatedDtoSchema = z.object({
  id: z.string().uuid(),
  version: z.number().int().positive(),
  status: AssessmentStatusEnum,
});

export type CreateAssessmentDto = z.infer<typeof CreateAssessmentDtoSchema>;
export type UpdateAssessmentDto = z.infer<typeof UpdateAssessmentDtoSchema>;
export type AssessmentDto = z.infer<typeof AssessmentDtoSchema>;
export type AssessmentCreatedDto = z.infer<typeof AssessmentCreatedDtoSchema>;
