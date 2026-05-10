import { z } from 'zod';

const RoomStatusSchema = z.enum(['active', 'maintenance']);

export const CreateSensoryRoomDtoSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(20),
  departmentId: z.string().uuid().nullable().optional(),
  equipmentList: z.string().array().default([]),
  status: RoomStatusSchema.default('active'),
});

export const UpdateSensoryRoomDtoSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    code: z.string().min(1).max(20).optional(),
    departmentId: z.string().uuid().nullable().optional(),
    equipmentList: z.string().array().optional(),
    status: RoomStatusSchema.optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, 'At least one field is required');

export type CreateSensoryRoomDto = z.infer<typeof CreateSensoryRoomDtoSchema>;
export type UpdateSensoryRoomDto = z.infer<typeof UpdateSensoryRoomDtoSchema>;
