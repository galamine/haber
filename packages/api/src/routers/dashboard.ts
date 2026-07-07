import prisma from "@haber-final/db";
import {
	adminProcedure,
	clinicAdminProcedure,
	protectedProcedure,
	router,
} from "../index";
import {
	ChildDashboardInput,
	GameScoreTrendsInput,
	PlatformSummarySchema,
} from "../schemas/dashboard";
import { GetCalendarInput } from "../schemas/session";
import { assertAssignedTherapist, getChildForRead } from "./child";
import { computeClinicSummaries } from "./clinic";

export const dashboardRouter: ReturnType<typeof router> = router({
	// ── Child procedures (assigned-therapist only) ──────────────────────────

	childSnapshot: protectedProcedure
		.input(ChildDashboardInput)
		.query(async ({ input, ctx }) => {
			await assertAssignedTherapist(input.childId, ctx);
			const child = await getChildForRead(input.childId, ctx);

			const plan = await prisma.treatmentPlan.findFirst({
				where: { childId: input.childId, isActive: true },
			});

			const [sessions, nextSession] = await Promise.all([
				prisma.therapySession.findMany({
					where: {
						childId: input.childId,
						status: { in: ["COMPLETED", "ABSENT"] },
					},
				}),
				prisma.therapySession.findFirst({
					where: {
						childId: input.childId,
						status: "PENDING",
						scheduledDate: { gte: new Date() },
					},
					orderBy: { scheduledDate: "asc" },
					select: { scheduledDate: true },
				}),
			]);

			const completed = sessions.filter((s) => s.status === "COMPLETED").length;
			const attendancePct =
				sessions.length > 0 ? (completed / sessions.length) * 100 : 0;

			const dob = new Date(child.dob);
			const now = new Date();
			let age = now.getFullYear() - dob.getFullYear();
			const m = now.getMonth() - dob.getMonth();
			if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
				age--;
			}

			return {
				name: child.fullName,
				age,
				opNumber: child.opNumber,
				activePlan: plan
					? { id: plan.id, name: plan.name, status: plan.status }
					: null,
				nextSession: nextSession?.scheduledDate ?? null,
				attendancePct,
			};
		}),

	milestoneRadar: protectedProcedure
		.input(ChildDashboardInput)
		.query(async ({ input, ctx }) => {
			await assertAssignedTherapist(input.childId, ctx);

			const assessments = await prisma.initialAssessment.findMany({
				where: { childId: input.childId },
				orderBy: { versionNumber: "asc" },
			});

			return assessments.map((a) => {
				const sectionC = a.sectionC as {
					milestones: Array<{
						milestoneId: string;
						delayed: boolean;
					}>;
				};
				return {
					versionNumber: a.versionNumber,
					recordedAt: a.createdAt,
					milestones: sectionC.milestones.map((m) => ({
						milestoneId: m.milestoneId,
						attained: !m.delayed,
					})),
				};
			});
		}),

	sensoryDeltaHistory: protectedProcedure
		.input(ChildDashboardInput)
		.query(async ({ input, ctx }) => {
			await assertAssignedTherapist(input.childId, ctx);

			const [initialProfiles, followUpProfiles] = await Promise.all([
				prisma.sensoryProfile.findMany({
					where: { assessment: { childId: input.childId } },
					orderBy: { recordedAt: "asc" },
				}),
				prisma.sensoryProfile.findMany({
					where: { followUp: { childId: input.childId } },
					orderBy: { recordedAt: "asc" },
				}),
			]);

			const bySystem = new Map<
				string,
				Array<{
					recordedAt: Date;
					rating: number;
					source: "initial" | "followUp";
				}>
			>();

			for (const p of initialProfiles) {
				if (!bySystem.has(p.systemId)) bySystem.set(p.systemId, []);
				bySystem.get(p.systemId)!.push({
					recordedAt: p.recordedAt,
					rating: p.rating,
					source: "initial",
				});
			}

			for (const p of followUpProfiles) {
				if (!bySystem.has(p.systemId)) bySystem.set(p.systemId, []);
				bySystem.get(p.systemId)!.push({
					recordedAt: p.recordedAt,
					rating: p.rating,
					source: "followUp",
				});
			}

			return Array.from(bySystem.entries()).map(([systemId, dataPoints]) => ({
				systemId,
				dataPoints,
			}));
		}),

	gameScoreTrends: protectedProcedure
		.input(GameScoreTrendsInput)
		.query(async ({ input, ctx }) => {
			await assertAssignedTherapist(input.childId, ctx);

			const sessionsWithResults = await prisma.therapySession.findMany({
				where: {
					childId: input.childId,
					status: "COMPLETED",
					result: { isNot: null },
					...(input.gameId && {
						gameAssignments: {
							some: {
								gameVersion: { gameId: input.gameId },
							},
						},
					}),
				},
				include: {
					result: true,
					gameAssignments: {
						include: {
							gameVersion: { include: { game: true } },
						},
					},
				},
			});

			return sessionsWithResults.map((s) => {
				const scored = s.result?.scored as { score: number } | null;
				return {
					date: s.scheduledDate,
					gameId: s.gameAssignments[0]?.gameVersion.gameId ?? "",
					gameName: s.gameAssignments[0]?.gameVersion.game.name ?? "",
					score: scored?.score ?? 0,
					rawMetrics: s.result?.rawMetrics ?? null,
				};
			});
		}),

	sessionCalendar: protectedProcedure
		.input(GetCalendarInput)
		.query(async ({ input, ctx }) => {
			await assertAssignedTherapist(input.childId, ctx);

			const startDate = new Date(input.year, input.month - 1, 1);
			const endDate = new Date(input.year, input.month, 0, 23, 59, 59, 999);

			const sessions = await prisma.therapySession.findMany({
				where: {
					childId: input.childId,
					scheduledDate: { gte: startDate, lte: endDate },
				},
				orderBy: { scheduledDate: "asc" },
				include: {
					gameAssignments: { orderBy: { order: "asc" } },
				},
			});

			const grouped: Record<string, typeof sessions> = {};
			for (const session of sessions) {
				const dateKey = session.scheduledDate.toISOString().split("T")[0]!;
				if (!grouped[dateKey]) grouped[dateKey] = [];
				grouped[dateKey].push(session);
			}

			return grouped;
		}),

	notesTimeline: protectedProcedure
		.input(ChildDashboardInput)
		.query(async ({ input, ctx }) => {
			await assertAssignedTherapist(input.childId, ctx);

			const [sessionNotes, initialAssessments, followUps] = await Promise.all([
				prisma.therapySession.findMany({
					where: {
						childId: input.childId,
						notes: { not: null },
					},
					select: {
						notes: true,
						scheduledDate: true,
						createdAt: true,
					},
				}),
				prisma.initialAssessment.findMany({
					where: { childId: input.childId },
					select: {
						sectionB: true,
						sectionD: true,
						sectionE: true,
						sectionF: true,
						createdAt: true,
					},
				}),
				prisma.followUpAssessment.findMany({
					where: { childId: input.childId },
					select: {
						sectionD: true,
						sectionE: true,
						createdAt: true,
					},
				}),
			]);

			const entries: Array<{
				date: Date;
				source: "session" | "assessment" | "followUp";
				section?: string;
				content: string;
			}> = [];

			for (const s of sessionNotes) {
				entries.push({
					date: s.scheduledDate,
					source: "session",
					content: s.notes!,
				});
			}

			for (const a of initialAssessments) {
				const b = a.sectionB as {
					prenatalHistory?: string;
					birthHistory?: string;
					neonatalHistory?: string;
					medicalHistory?: string;
					previousTherapies?: string;
				} | null;
				const d = a.sectionD as {
					behaviouralObservations?: string;
				} | null;
				const e = a.sectionE as {
					observations?: string;
				} | null;
				const f = a.sectionF as {
					overallSummary?: string;
				} | null;

				if (b?.previousTherapies) {
					entries.push({
						date: a.createdAt,
						source: "assessment",
						section: "B",
						content: b.previousTherapies,
					});
				}
				if (d?.behaviouralObservations) {
					entries.push({
						date: a.createdAt,
						source: "assessment",
						section: "D",
						content: d.behaviouralObservations,
					});
				}
				if (e?.observations) {
					entries.push({
						date: a.createdAt,
						source: "assessment",
						section: "E",
						content: e.observations,
					});
				}
				if (f?.overallSummary) {
					entries.push({
						date: a.createdAt,
						source: "assessment",
						section: "F",
						content: f.overallSummary,
					});
				}
			}

			for (const fu of followUps) {
				const d = fu.sectionD as {
					therapistObservations?: string;
				} | null;
				const e = fu.sectionE as {
					clinicalNotes?: string;
				} | null;

				if (d?.therapistObservations) {
					entries.push({
						date: fu.createdAt,
						source: "followUp",
						section: "D",
						content: d.therapistObservations,
					});
				}
				if (e?.clinicalNotes) {
					entries.push({
						date: fu.createdAt,
						source: "followUp",
						section: "E",
						content: e.clinicalNotes,
					});
				}
			}

			entries.sort((a, b) => a.date.getTime() - b.date.getTime());

			return entries;
		}),

	// ── Clinic summary (clinicAdmin only) ───────────────────────────────────

	clinicSummary: clinicAdminProcedure.query(async ({ ctx }) => {
		const clinicId = ctx.auth.tenantId!;

		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);

		const dayOfWeek = today.getDay();
		const startOfWeek = new Date(today);
		startOfWeek.setDate(today.getDate() - dayOfWeek);
		const endOfWeek = new Date(startOfWeek);
		endOfWeek.setDate(startOfWeek.getDate() + 6);
		endOfWeek.setHours(23, 59, 59, 999);

		const [activeChildren, sessionsToday, sessionsThisWeek, rooms] =
			await Promise.all([
				prisma.child.count({
					where: { clinicId, deletedAt: null },
				}),
				prisma.therapySession.count({
					where: {
						plan: { clinicId },
						scheduledDate: { gte: today, lt: tomorrow },
					},
				}),
				prisma.therapySession.count({
					where: {
						plan: { clinicId },
						scheduledDate: {
							gte: startOfWeek,
							lte: endOfWeek,
						},
					},
				}),
				prisma.sensoryRoom.findMany({
					where: { clinicId, status: "ACTIVE" },
					select: { id: true },
				}),
			]);

		const totalRooms = rooms.length;
		const bookedToday = await prisma.roomBooking.count({
			where: {
				roomId: { in: rooms.map((r) => r.id) },
				scheduledDate: { gte: today, lt: tomorrow },
			},
		});

		const [therapistSessions, weekSessions, categoryActivity] =
			await Promise.all([
				prisma.therapySession.groupBy({
					by: ["assignedTherapistId"],
					where: {
						plan: { clinicId },
						scheduledDate: { gte: today, lt: tomorrow },
						assignedTherapistId: { not: null },
					},
					_count: true,
				}),
				prisma.therapySession.groupBy({
					by: ["status"],
					where: {
						plan: { clinicId },
						scheduledDate: {
							gte: startOfWeek,
							lte: endOfWeek,
						},
					},
					_count: true,
				}),
				prisma.gameCategory.findMany({
					where: { clinicId },
					include: {
						games: {
							include: {
								versions: {
									include: {
										sessionAssignments: {
											where: {
												session: {
													scheduledDate: {
														gte: startOfWeek,
														lte: endOfWeek,
													},
												},
											},
											select: { id: true },
										},
									},
								},
							},
						},
					},
				}),
			]);

		const therapistIds = therapistSessions
			.map((t) => t.assignedTherapistId)
			.filter((id): id is string => id !== null);
		const therapistNames =
			therapistIds.length > 0
				? await prisma.user.findMany({
						where: { id: { in: therapistIds } },
						select: { id: true, email: true },
					})
				: [];
		const nameMap = new Map(therapistNames.map((u) => [u.id, u.email]));

		const therapistLoad = therapistSessions.map((t) => ({
			therapistId: t.assignedTherapistId ?? "",
			name: nameMap.get(t.assignedTherapistId ?? "") ?? "",
			count: t._count,
		}));

		const totalWeek = weekSessions.reduce((s, g) => s + g._count, 0);
		const completedWeek =
			weekSessions.find((g) => g.status === "COMPLETED")?._count ?? 0;
		const planAdherenceRate =
			totalWeek > 0 ? (completedWeek / totalWeek) * 100 : 0;

		const topCategoriesByActivity = categoryActivity
			.map((cat) => ({
				categoryId: cat.id,
				name: cat.name,
				sessionCount: cat.games.reduce(
					(
						s: number,
						g: { versions: { sessionAssignments: { id: string }[] }[] },
					) =>
						s +
						g.versions.reduce(
							(vs: number, v: { sessionAssignments: { id: string }[] }) =>
								vs + v.sessionAssignments.length,
							0,
						),
					0,
				),
			}))
			.filter((c) => c.sessionCount > 0)
			.sort((a, b) => b.sessionCount - a.sessionCount);

		return {
			activeChildren,
			sessionsToday,
			sessionsThisWeek,
			roomUtilisation: { booked: bookedToday, total: totalRooms },
			therapistLoad,
			planAdherenceRate,
			topCategoriesByActivity,
		};
	}),

	// ── Platform summary (SuperAdmin only) ──────────────────────────────────

	platformSummary: adminProcedure.query(async () => {
		const summary = await computeClinicSummaries();
		return PlatformSummarySchema.parse(summary);
	}),
});
