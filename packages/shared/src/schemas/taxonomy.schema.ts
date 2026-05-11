import { z } from 'zod';

export const TaxonomyTypeSchema = z.enum([
  'diagnoses',
  'milestones',
  'sensory-systems',
  'functional-concerns',
  'assessment-tools',
  'equipment',
  'intervention-approaches',
]);

export type TaxonomyType = z.infer<typeof TaxonomyTypeSchema>;

// Response DTOs

export const DiagnosisDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  icdReference: z.string().nullable(),
  frameworkId: z.string(),
  tenantId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
});

export const MilestoneDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  ageBandMinMonths: z.number().int(),
  ageBandMaxMonths: z.number().int(),
  scoringScaleMin: z.number().int(),
  scoringScaleMax: z.number().int(),
  description: z.string(),
  frameworkId: z.string(),
  tenantId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
});

export const SensorySystemDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  frameworkId: z.string(),
  tenantId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
});

export const FunctionalConcernDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  category: z.string().nullable(),
  frameworkId: z.string(),
  tenantId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
});

export const AssessmentToolDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  fullName: z.string().nullable(),
  description: z.string().nullable(),
  frameworkId: z.string(),
  tenantId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
});

export const EquipmentDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  category: z.string().nullable(),
  frameworkId: z.string(),
  tenantId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
});

export const InterventionApproachDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  frameworkId: z.string(),
  tenantId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
});

// Create DTOs

export const CreateDiagnosisDtoSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  icdReference: z.string().max(20).optional(),
});

export const CreateMilestoneDtoSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  ageBandMinMonths: z.number().int().min(0),
  ageBandMaxMonths: z.number().int().min(0),
  description: z.string().min(1, 'Description is required').max(500),
});

export const CreateSensorySystemDtoSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().min(1, 'Description is required').max(500),
});

export const CreateFunctionalConcernDtoSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  category: z.string().max(100).optional(),
});

export const CreateAssessmentToolDtoSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  fullName: z.string().max(300).optional(),
  description: z.string().max(500).optional(),
});

export const CreateEquipmentDtoSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  category: z.string().max(100).optional(),
});

export const CreateInterventionApproachDtoSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(500).optional(),
});

export const CREATE_SCHEMA_MAP = {
  diagnoses: CreateDiagnosisDtoSchema,
  milestones: CreateMilestoneDtoSchema,
  'sensory-systems': CreateSensorySystemDtoSchema,
  'functional-concerns': CreateFunctionalConcernDtoSchema,
  'assessment-tools': CreateAssessmentToolDtoSchema,
  equipment: CreateEquipmentDtoSchema,
  'intervention-approaches': CreateInterventionApproachDtoSchema,
} as const;

// Inferred types
export type DiagnosisDto = z.infer<typeof DiagnosisDtoSchema>;
export type MilestoneDto = z.infer<typeof MilestoneDtoSchema>;
export type SensorySystemDto = z.infer<typeof SensorySystemDtoSchema>;
export type FunctionalConcernDto = z.infer<typeof FunctionalConcernDtoSchema>;
export type AssessmentToolDto = z.infer<typeof AssessmentToolDtoSchema>;
export type EquipmentDto = z.infer<typeof EquipmentDtoSchema>;
export type InterventionApproachDto = z.infer<typeof InterventionApproachDtoSchema>;

export type CreateDiagnosisDto = z.infer<typeof CreateDiagnosisDtoSchema>;
export type CreateMilestoneDto = z.infer<typeof CreateMilestoneDtoSchema>;
export type CreateSensorySystemDto = z.infer<typeof CreateSensorySystemDtoSchema>;
export type CreateFunctionalConcernDto = z.infer<typeof CreateFunctionalConcernDtoSchema>;
export type CreateAssessmentToolDto = z.infer<typeof CreateAssessmentToolDtoSchema>;
export type CreateEquipmentDto = z.infer<typeof CreateEquipmentDtoSchema>;
export type CreateInterventionApproachDto = z.infer<typeof CreateInterventionApproachDtoSchema>;
