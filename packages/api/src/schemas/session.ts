import { z } from "zod";

export const SessionStatusEnum = z.enum([
	"PENDING",
	"IN_PROGRESS",
	"COMPLETED",
	"ABSENT",
	"MANUALLY_CLOSED",
]);

export const ListForPlanInput = z.object({
	planId: z.string(),
	status: SessionStatusEnum.optional(),
	fromDate: z.coerce.date().optional(),
	toDate: z.coerce.date().optional(),
});

export const ListForChildInput = z.object({
	childId: z.string(),
	status: SessionStatusEnum.optional(),
	fromDate: z.coerce.date().optional(),
	toDate: z.coerce.date().optional(),
});

export const GetCalendarInput = z.object({
	childId: z.string(),
	month: z.number().int().min(1).max(12),
	year: z.number().int(),
});

export const CheckConflictsInput = z.object({
	scheduledDate: z.coerce.date(),
	durationMinutes: z.number().int().positive(),
	roomId: z.string().optional(),
	assignedTherapistId: z.string().optional(),
	excludeSessionId: z.string().optional(),
});

export const CreateSessionInput = z.object({
	planId: z.string(),
	scheduledDate: z.coerce.date(),
	durationMinutes: z.number().int().positive(),
	roomId: z.string(),
	assignedTherapistId: z.string().optional(),
	gameVersionId: z.string(),
	durationSeconds: z.number().int().positive().optional(),
	repetitions: z.number().int().positive().optional(),
	instructions: z.string().optional(),
	acknowledgeConflict: z.boolean().default(false),
});
