import { CreateClinicDtoSchema, UpdateClinicDtoSchema } from '@haber/shared';
import { z } from 'zod';

const uuidParam = z.object({ clinicId: z.string().uuid('Invalid clinic ID') });

const createClinic = { body: CreateClinicDtoSchema };

const getClinics = {
  query: z.object({
    sortBy: z.string().optional(),
    limit: z.coerce.number().int().positive().optional(),
    page: z.coerce.number().int().positive().optional(),
  }),
};

const getClinic = { params: uuidParam };

const updateClinic = {
  params: uuidParam,
  body: UpdateClinicDtoSchema,
};

const getMyClinic = {};

export default {
  createClinic,
  getClinics,
  getClinic,
  updateClinic,
  getMyClinic,
};
