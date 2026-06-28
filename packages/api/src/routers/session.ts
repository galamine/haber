import prisma from "@haber-final/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../index";
import { GetCalendarInput, ListForPlanInput } from "../schemas/session";
import {
	AssignRoomInput,
	ClaimCoverageInput,
	GetWebhookUrlInput,
	ManualCloseInput,
} from "../schemas/session-execution";

export const sessionRouter: ReturnType<typeof router> = router({
	listForPlan: protectedProcedure
		.input(ListForPlanInput)
		.query(async ({ input }) => {
			const where: Record<string, unknown> = { planId: input.planId };

			if (input.status) {
				where.status = input.status;
			}

			if (input.fromDate || input.toDate) {
				where.scheduledDate = {};
				if (input.fromDate) {
					(where.scheduledDate as Record<string, Date>).gte = input.fromDate;
				}
				if (input.toDate) {
					(where.scheduledDate as Record<string, Date>).lte = input.toDate;
				}
			}

			return prisma.therapySession.findMany({
				where,
				orderBy: { scheduledDate: "asc" },
				include: { gameAssignments: { orderBy: { order: "asc" } } },
			});
		}),

	listForToday: protectedProcedure.query(async ({ ctx }) => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);

		return prisma.therapySession.findMany({
			where: {
				assignedTherapistId: ctx.auth.userId,
				scheduledDate: {
					gte: today,
					lt: tomorrow,
				},
			},
			orderBy: { scheduledDate: "asc" },
			include: { gameAssignments: { orderBy: { order: "asc" } } },
		});
	}),

	getCalendar: protectedProcedure
		.input(GetCalendarInput)
		.query(async ({ input }) => {
			const startDate = new Date(input.year, input.month - 1, 1);
			const endDate = new Date(input.year, input.month, 0, 23, 59, 59, 999);

			const sessions = await prisma.therapySession.findMany({
				where: {
					childId: input.childId,
					scheduledDate: {
						gte: startDate,
						lte: endDate,
					},
				},
				orderBy: { scheduledDate: "asc" },
				include: { gameAssignments: { orderBy: { order: "asc" } } },
			});

			const grouped: Record<string, typeof sessions> = {};
			for (const session of sessions) {
				const dateKey = session.scheduledDate.toISOString().split("T")[0];
				if (!grouped[dateKey]) {
					grouped[dateKey] = [];
				}
				grouped[dateKey].push(session);
			}

			return grouped;
		}),

	get: protectedProcedure
		.input(z.object({ sessionId: z.string() }))
		.query(async ({ input }) => {
			const session = await prisma.therapySession.findUnique({
				where: { id: input.sessionId },
				include: {
					gameAssignments: {
						orderBy: { order: "asc" },
						include: { gameVersion: { include: { game: true } } },
					},
					result: true,
				},
			});
			if (!session) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}
			return session;
		}),

	assignRoom: protectedProcedure
		.input(AssignRoomInput)
		.mutation(async ({ input }) => {
			const session = await prisma.therapySession.findUnique({
				where: { id: input.sessionId },
			});
			if (!session) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			const existingBooking = await prisma.roomBooking.findFirst({
				where: {
					roomId: input.roomId,
					scheduledDate: session.scheduledDate,
				},
			});
			if (existingBooking) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "Room is already booked for this date",
				});
			}

			return prisma.roomBooking.create({
				data: {
					sessionId: input.sessionId,
					roomId: input.roomId,
					scheduledDate: session.scheduledDate,
					claimedById: session.assignedTherapistId ?? "",
				},
			});
		}),

	markAbsent: protectedProcedure
		.input(z.object({ sessionId: z.string() }))
		.mutation(async ({ input }) => {
			const session = await prisma.therapySession.findUnique({
				where: { id: input.sessionId },
			});
			if (!session) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			if (session.status !== "PENDING") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Can only mark absent for PENDING sessions",
				});
			}

			return prisma.therapySession.update({
				where: { id: input.sessionId },
				data: { status: "ABSENT" },
			});
		}),

	manualClose: protectedProcedure
		.input(ManualCloseInput)
		.mutation(async ({ input }) => {
			const session = await prisma.therapySession.findUnique({
				where: { id: input.sessionId },
			});
			if (!session) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			if (session.status !== "PENDING" && session.status !== "IN_PROGRESS") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Can only manually close PENDING or IN_PROGRESS sessions",
				});
			}

			return prisma.therapySession.update({
				where: { id: input.sessionId },
				data: {
					status: "MANUALLY_CLOSED",
					notes: input.notes ?? session.notes,
					qualityTag: input.qualityTag ?? session.qualityTag,
				},
			});
		}),

	addNotes: protectedProcedure
		.input(
			z.object({
				sessionId: z.string(),
				notes: z.string(),
				qualityTag: z.enum(["CALM", "DISTRACTED", "REFUSED"]).optional(),
			}),
		)
		.mutation(async ({ input }) => {
			const session = await prisma.therapySession.findUnique({
				where: { id: input.sessionId },
			});
			if (!session) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			return prisma.therapySession.update({
				where: { id: input.sessionId },
				data: {
					notes: input.notes,
					qualityTag: input.qualityTag ?? session.qualityTag,
				},
			});
		}),

	getWebhookUrl: protectedProcedure
		.input(GetWebhookUrlInput)
		.query(async ({ input }) => {
			const session = await prisma.therapySession.findUnique({
				where: { id: input.sessionId },
				include: { gameAssignments: true },
			});
			if (!session) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			return {
				gameId: input.gameId,
				version: input.gameVersion,
				sessionId: input.sessionId,
				webhookSecret: session.webhookSecret,
			};
		}),

	claimCoverage: protectedProcedure
		.input(ClaimCoverageInput)
		.mutation(async ({ input, ctx }) => {
			const session = await prisma.therapySession.findUnique({
				where: { id: input.sessionId },
			});
			if (!session) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			if (session.assignedTherapistId) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "Session is already assigned to a therapist",
				});
			}

			return prisma.therapySession.update({
				where: { id: input.sessionId },
				data: { assignedTherapistId: ctx.auth.userId },
			});
		}),

	listUncovered: protectedProcedure.query(async () => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);

		return prisma.therapySession.findMany({
			where: {
				assignedTherapistId: null,
				status: "PENDING",
				scheduledDate: {
					gte: today,
					lt: tomorrow,
				},
			},
			orderBy: { scheduledDate: "asc" },
			include: { gameAssignments: { orderBy: { order: "asc" } } },
		});
	}),
});
