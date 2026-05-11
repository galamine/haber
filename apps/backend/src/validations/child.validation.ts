import {
  CreateChildDtoSchema,
  CreateGuardianDtoSchema,
  UpdateChildDtoSchema,
  UpdateGuardianDtoSchema,
  UpsertMedicalHistoryDtoSchema,
} from '@haber/shared';
import { z } from 'zod';

const childIdParam = z.object({ childId: z.string().uuid('Invalid child ID') });
const guardianIdParam = z.object({ guardianId: z.string().uuid('Invalid guardian ID') });

const createChild = { body: CreateChildDtoSchema };

const getChildren = {
  query: z.object({
    name: z.string().optional(),
    opNumber: z.string().optional(),
    includeDeleted: z.coerce.boolean().optional(),
    sortBy: z.string().optional(),
    limit: z.coerce.number().int().positive().optional(),
    page: z.coerce.number().int().positive().optional(),
  }),
};

const getChild = { params: childIdParam };

const updateChild = {
  params: childIdParam,
  body: UpdateChildDtoSchema,
};

const upsertMedicalHistory = {
  params: childIdParam,
  body: UpsertMedicalHistoryDtoSchema,
};

const createGuardian = {
  params: childIdParam,
  body: CreateGuardianDtoSchema,
};

const updateGuardian = {
  params: childIdParam.merge(guardianIdParam),
  body: UpdateGuardianDtoSchema,
};

const getIntakeStatus = { params: childIdParam };

const softDeleteChild = { params: childIdParam };

export default {
  createChild,
  getChildren,
  getChild,
  updateChild,
  upsertMedicalHistory,
  createGuardian,
  updateGuardian,
  getIntakeStatus,
  softDeleteChild,
};
