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

export const GetCalendarInput = z.object({
	childId: z.string(),
	month: z.number().int().min(1).max(12),
	year: z.number().int(),
});
