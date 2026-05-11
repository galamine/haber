import { z } from 'zod';

export const SexEnum = z.enum(['male', 'female', 'other']);
export type Sex = z.infer<typeof SexEnum>;

export const BirthTermEnum = z.enum(['term', 'preterm']);
export type BirthTerm = z.infer<typeof BirthTermEnum>;

export const CreateChildDtoSchema = z.object({
  fullName: z.string().min(1),
  dob: z.string().datetime(),
  sex: SexEnum,
  spokenLanguages: z.string().array().default([]),
  school: z.string().optional(),
  opNumber: z.string().optional(),
  preferredTherapistId: z.string().uuid().optional(),
  assignedTherapistIds: z.string().uuid().array().optional(),
});

export const UpdateChildDtoSchema = z
  .object({
    fullName: z.string().min(1).optional(),
    dob: z.string().datetime().optional(),
    sex: SexEnum.optional(),
    spokenLanguages: z.string().array().optional(),
    school: z.string().optional(),
    opNumber: z.string().optional(),
    preferredTherapistId: z.string().uuid().optional(),
    assignedTherapistIds: z.string().uuid().array().optional(),
    heightCm: z.number().positive().optional(),
    weightKg: z.number().positive().optional(),
    measurementDate: z.string().datetime().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, 'At least one field is required');

export const CreateGuardianDtoSchema = z.object({
  fullName: z.string().min(1),
  relationship: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  loginEnabled: z.boolean().default(false),
});

export const UpdateGuardianDtoSchema = CreateGuardianDtoSchema.partial();

export const MedicationEntrySchema = z.object({
  name: z.string(),
  dose: z.string(),
  frequency: z.string(),
});

export const UpsertMedicalHistoryDtoSchema = z.object({
  birthTerm: BirthTermEnum,
  gestationalAgeWeeks: z.number().int().positive().optional(),
  birthComplications: z.string().optional(),
  neonatalHistory: z.string().optional(),
  immunizations: z.string().optional(),
  allergies: z.string().optional(),
  currentMedications: MedicationEntrySchema.array().default([]),
  priorDiagnoses: z.string().array().optional(),
  familyHistory: z.string().optional(),
  sensorySensitivities: z.string().optional(),
});

export const ChildDtoSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  childCode: z.string(),
  opNumber: z.string().nullable(),
  fullName: z.string(),
  dob: z.string().datetime(),
  sex: SexEnum,
  photoUrl: z.string().nullable(),
  spokenLanguages: z.string().array(),
  school: z.string().nullable(),
  preferredTherapistId: z.string().uuid().nullable(),
  heightCm: z.number().nullable(),
  weightKg: z.number().nullable(),
  measurementDate: z.string().datetime().nullable(),
  latestPlanId: z.string().uuid().nullable(),
  intakeComplete: z.boolean(),
  assignedTherapistIds: z.string().uuid().array(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const GuardianDtoSchema = z.object({
  id: z.string().uuid(),
  childId: z.string().uuid(),
  fullName: z.string(),
  relationship: z.string(),
  phone: z.string(),
  email: z.string().nullable(),
  loginEnabled: z.boolean(),
  createdAt: z.string().datetime(),
});

export const MedicalHistoryDtoSchema = z.object({
  id: z.string().uuid(),
  childId: z.string().uuid(),
  birthTerm: BirthTermEnum,
  birthComplications: z.string().nullable(),
  neonatalHistory: z.string().nullable(),
  gestationalAgeWeeks: z.number().int().nullable(),
  immunizations: z.string().nullable(),
  allergies: z.string().nullable(),
  currentMedications: MedicationEntrySchema.array(),
  priorDiagnoses: z.string().array().nullable(),
  familyHistory: z.string().nullable(),
  sensorySensitivities: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const PaginatedChildDtoSchema = z.object({
  results: z.array(ChildDtoSchema),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
  totalResults: z.number().int().nonnegative(),
});

export const IntakeStatusDtoSchema = z.object({
  intakeComplete: z.boolean(),
  missingFields: z.string().array(),
});

export type CreateChildDto = z.infer<typeof CreateChildDtoSchema>;
export type UpdateChildDto = z.infer<typeof UpdateChildDtoSchema>;
export type CreateGuardianDto = z.infer<typeof CreateGuardianDtoSchema>;
export type UpdateGuardianDto = z.infer<typeof UpdateGuardianDtoSchema>;
export type MedicationEntry = z.infer<typeof MedicationEntrySchema>;
export type UpsertMedicalHistoryDto = z.infer<typeof UpsertMedicalHistoryDtoSchema>;
export type ChildDto = z.infer<typeof ChildDtoSchema>;
export type GuardianDto = z.infer<typeof GuardianDtoSchema>;
export type MedicalHistoryDto = z.infer<typeof MedicalHistoryDtoSchema>;
export type PaginatedChildDto = z.infer<typeof PaginatedChildDtoSchema>;
export type IntakeStatusDto = z.infer<typeof IntakeStatusDtoSchema>;
