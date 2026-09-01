import prisma from "@haber-final/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../index";
import { matchResultToAssignments } from "../lib/game-result-summary";
import { findConflicts } from "../lib/session-conflicts";
import {
	CheckConflictsInput,
	CreateSessionInput,
	GetCalendarInput,
	ListForChildInput,
	ListForPlanInput,
} from "../schemas/session";
import {
	AssignRoomInput,
	ClaimCoverageInput,
	GetWebhookUrlInput,
	ManualCloseInput,
} from "../schemas/session-execution";
import { getChildForRead } from "./child";
import { getPlanForTherapist } from "./plan";

async function getSessionForTherapist(
	sessionId: string,
	ctx: Parameters<typeof getChildForRead>[1],
) {
	const session = await prisma.therapySession.findFirst({
		where: {
			id: sessionId,
			...(ctx.auth.role !== "SUPER_ADMIN"
				? { plan: { clinicId: ctx.auth.tenantId ?? undefined } }
				: {}),
		},
	});
	if (!session) throw new TRPCError({ code: "NOT_FOUND" });

	if (ctx.auth.role === "THERAPIST" || ctx.auth.role === "STAFF") {
		const isAssigned =
			(await prisma.childTherapistAssignment.findFirst({
				where: { childId: session.childId, therapistId: ctx.auth.userId },
			})) !== null;
		if (!isAssigned)
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You are not assigned to this child",
			});
	}

	return session;
}

function attachResultSummary<
	T extends {
		result: { rawMetrics: unknown } | null;
		gameAssignments: {
			gameVersion: { game: { key: string | null } };
		}[];
	},
>(session: T) {
	return {
		...session,
		gameAssignments: matchResultToAssignments(
			session.gameAssignments,
			session.result,
		),
	};
}

export const sessionRouter = router({
	listForPlan: protectedProcedure
		.input(ListForPlanInput)
		.query(async ({ input, ctx }) => {
			await getPlanForTherapist(input.planId, ctx);

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

			const sessions = await prisma.therapySession.findMany({
				where,
				orderBy: { scheduledDate: "asc" },
				include: {
					result: true,
					gameAssignments: {
						orderBy: { order: "asc" },
						include: { gameVersion: { include: { game: true } } },
					},
				},
			});

			return sessions.map(attachResultSummary);
		}),

	listForChild: protectedProcedure
		.input(ListForChildInput)
		.query(async ({ input, ctx }) => {
			await getChildForRead(input.childId, ctx);

			const where: Record<string, unknown> = { childId: input.childId };

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

			const sessions = await prisma.therapySession.findMany({
				where,
				orderBy: { scheduledDate: "asc" },
				include: {
					result: true,
					gameAssignments: {
						orderBy: { order: "asc" },
						include: { gameVersion: { include: { game: true } } },
					},
				},
			});

			return sessions.map(attachResultSummary);
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
			include: { gameAssignments: { orderBy: { order: "asc" } }, child: true },
		});
	}),

	listForWeek: protectedProcedure.query(async ({ ctx }) => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const dayOfWeek = today.getDay();
		const startOfWeek = new Date(today);
		startOfWeek.setDate(today.getDate() - dayOfWeek);
		const endOfWeek = new Date(startOfWeek);
		endOfWeek.setDate(startOfWeek.getDate() + 6);
		endOfWeek.setHours(23, 59, 59, 999);

		return prisma.therapySession.findMany({
			where: {
				assignedTherapistId: ctx.auth.userId,
				scheduledDate: {
					gte: startOfWeek,
					lte: endOfWeek,
				},
			},
			orderBy: { scheduledDate: "asc" },
			include: {
				gameAssignments: { orderBy: { order: "asc" } },
				child: { select: { fullName: true } },
			},
		});
	}),

	listNeedingNotes: protectedProcedure.query(async ({ ctx }) => {
		return prisma.therapySession.findMany({
			where: {
				assignedTherapistId: ctx.auth.userId,
				status: { in: ["COMPLETED", "MANUALLY_CLOSED"] },
				notes: null,
			},
			orderBy: { scheduledDate: "desc" },
			include: { child: { select: { fullName: true } } },
		});
	}),

	getCalendar: protectedProcedure
		.input(GetCalendarInput)
		.query(async ({ input, ctx }) => {
			await getChildForRead(input.childId, ctx);

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
				const dateKey = session.scheduledDate.toISOString().split("T")[0]!;
				if (!grouped[dateKey]) {
					grouped[dateKey] = [];
				}
				grouped[dateKey].push(session);
			}

			return grouped;
		}),

	checkConflicts: protectedProcedure
		.input(CheckConflictsInput)
		.query(async ({ input, ctx }) => {
			const clinicFilter =
				ctx.auth.role !== "SUPER_ADMIN"
					? { clinicId: ctx.auth.tenantId ?? undefined }
					: {};

			if (input.roomId) {
				const room = await prisma.sensoryRoom.findFirst({
					where: { id: input.roomId, ...clinicFilter },
				});
				if (!room) throw new TRPCError({ code: "NOT_FOUND" });
			}

			if (input.assignedTherapistId) {
				const therapist = await prisma.user.findFirst({
					where: { id: input.assignedTherapistId, ...clinicFilter },
				});
				if (!therapist) throw new TRPCError({ code: "NOT_FOUND" });
			}

			return findConflicts(input);
		}),

	create: protectedProcedure
		.input(CreateSessionInput)
		.mutation(async ({ input, ctx }) => {
			const plan = await getPlanForTherapist(input.planId, ctx);

			if (plan.status === "CLOSED") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Cannot create sessions for a closed plan",
				});
			}

			const room = await prisma.sensoryRoom.findFirst({
				where: {
					id: input.roomId,
					...(ctx.auth.role !== "SUPER_ADMIN"
						? { clinicId: ctx.auth.tenantId ?? undefined }
						: {}),
				},
			});
			if (!room) {
				throw new TRPCError({ code: "BAD_REQUEST", message: "Room not found" });
			}
			if (room.status === "MAINTENANCE") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Room is under maintenance",
				});
			}

			const { roomConflicts, therapistConflicts } = await findConflicts({
				scheduledDate: input.scheduledDate,
				durationMinutes: input.durationMinutes,
				roomId: input.roomId,
				assignedTherapistId: input.assignedTherapistId,
			});

			if (
				(roomConflicts.length > 0 || therapistConflicts.length > 0) &&
				!input.acknowledgeConflict
			) {
				throw new TRPCError({
					code: "CONFLICT",
					message:
						"This room or therapist is already booked for an overlapping time.",
					cause: { roomConflicts, therapistConflicts },
				});
			}

			return prisma.$transaction(async (tx) => {
				const session = await tx.therapySession.create({
					data: {
						planId: plan.id,
						childId: plan.childId,
						assignedTherapistId: input.assignedTherapistId,
						roomId: input.roomId,
						scheduledDate: input.scheduledDate,
						durationMinutes: input.durationMinutes,
						status: "PENDING",
					},
				});

				await tx.sessionGameAssignment.create({
					data: {
						sessionId: session.id,
						gameVersionId: input.gameVersionId,
						durationSeconds: input.durationSeconds,
						repetitions: input.repetitions,
						instructions: input.instructions,
						order: 0,
					},
				});

				return tx.therapySession.findUniqueOrThrow({
					where: { id: session.id },
					include: {
						gameAssignments: {
							include: { gameVersion: { include: { game: true } } },
						},
					},
				});
			});
		}),

	get: protectedProcedure
		.input(z.object({ sessionId: z.string() }))
		.query(async ({ input, ctx }) => {
			await getSessionForTherapist(input.sessionId, ctx);

			const session = await prisma.therapySession.findUniqueOrThrow({
				where: { id: input.sessionId },
				include: {
					gameAssignments: {
						orderBy: { order: "asc" },
						include: { gameVersion: { include: { game: true } } },
					},
					result: true,
					child: true,
					plan: true,
				},
			});
			return attachResultSummary(session);
		}),

	assignRoom: protectedProcedure
		.input(AssignRoomInput)
		.mutation(async ({ input, ctx }) => {
			const session = await getSessionForTherapist(input.sessionId, ctx);

			const room = await prisma.sensoryRoom.findFirst({
				where: {
					id: input.roomId,
					...(ctx.auth.role !== "SUPER_ADMIN"
						? { clinicId: ctx.auth.tenantId ?? undefined }
						: {}),
				},
			});
			if (!room) throw new TRPCError({ code: "NOT_FOUND" });

			const { roomConflicts } = await findConflicts({
				scheduledDate: session.scheduledDate,
				durationMinutes: session.durationMinutes,
				roomId: input.roomId,
				excludeSessionId: session.id,
			});
			if (roomConflicts.length > 0 && !input.acknowledgeConflict) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "Room is already booked for an overlapping time.",
					cause: { roomConflicts },
				});
			}

			return prisma.therapySession.update({
				where: { id: session.id },
				data: { roomId: input.roomId },
			});
		}),

	markAbsent: protectedProcedure
		.input(z.object({ sessionId: z.string() }))
		.mutation(async ({ input, ctx }) => {
			const session = await getSessionForTherapist(input.sessionId, ctx);

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
		.mutation(async ({ input, ctx }) => {
			const session = await getSessionForTherapist(input.sessionId, ctx);

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
		.mutation(async ({ input, ctx }) => {
			const session = await getSessionForTherapist(input.sessionId, ctx);

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
		.query(async ({ input, ctx }) => {
			const session = await getSessionForTherapist(input.sessionId, ctx);

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
			const session = await prisma.therapySession.findFirst({
				where: {
					id: input.sessionId,
					...(ctx.auth.role !== "SUPER_ADMIN"
						? { plan: { clinicId: ctx.auth.tenantId ?? undefined } }
						: {}),
				},
			});
			if (!session) throw new TRPCError({ code: "NOT_FOUND" });

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

	listUncovered: protectedProcedure.query(async ({ ctx }) => {
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
				...(ctx.auth.role !== "SUPER_ADMIN"
					? { plan: { clinicId: ctx.auth.tenantId ?? undefined } }
					: {}),
			},
			orderBy: { scheduledDate: "asc" },
			include: { gameAssignments: { orderBy: { order: "asc" } }, child: true },
		});
	}),
});
