import { InviteStaffDtoSchema, UpdateStaffDtoSchema } from '@haber/shared';
import { z } from 'zod';

const uuidParam = z.object({ userId: z.string().uuid('Invalid user ID') });

const inviteStaff = { body: InviteStaffDtoSchema };

const getStaff = {
  query: z.object({
    name: z.string().optional(),
    role: z.enum(['therapist', 'staff']).optional(),
    isActive: z.coerce.boolean().optional(),
    sortBy: z.string().optional(),
    limit: z.coerce.number().int().positive().optional(),
    page: z.coerce.number().int().positive().optional(),
  }),
};

const getStaffById = { params: uuidParam };

const updateStaff = {
  params: uuidParam,
  body: UpdateStaffDtoSchema,
};

const deactivateStaff = { params: uuidParam };

const reactivateStaff = { params: uuidParam };

export default { inviteStaff, getStaff, getStaffById, updateStaff, deactivateStaff, reactivateStaff };
