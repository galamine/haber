import prisma from "@haber-final/db";
import { protectedProcedure, router } from "../index";
import { ChildDashboardInput } from "../schemas/dashboard";
import { assertAssignedTherapist, getChildForRead } from "./child";

export const reportRouter: ReturnType<typeof router> = router({
	childProgress: protectedProcedure
		.input(ChildDashboardInput)
		.query(async ({ input, ctx }) => {
			await assertAssignedTherapist(input.childId, ctx);
			const child = await getChildForRead(input.childId, ctx);

			const [assessments, followUps, goals, sessions] = await Promise.all([
				prisma.initialAssessment.findMany({
					where: { childId: input.childId },
					orderBy: { versionNumber: "asc" },
					include: { sensoryProfiles: true },
				}),
				prisma.followUpAssessment.findMany({
					where: { childId: input.childId },
					orderBy: { versionNumber: "asc" },
					include: {
						sensoryProfiles: true,
						progressEntries: true,
					},
				}),
				prisma.goal.findMany({
					where: {
						plan: {
							childId: input.childId,
						},
					},
					include: { progressEntries: true },
				}),
				prisma.therapySession.findMany({
					where: { childId: input.childId },
					orderBy: { scheduledDate: "asc" },
					include: { result: true },
				}),
			]);

			return {
				child: {
					id: child.id,
					fullName: child.fullName,
					opNumber: child.opNumber,
					dob: child.dob,
					sex: child.sex,
				},
				assessments: assessments.map((a) => ({
					id: a.id,
					versionNumber: a.versionNumber,
					createdAt: a.createdAt,
					sectionC: a.sectionC,
					sensoryProfiles: a.sensoryProfiles.map((sp) => ({
						systemId: sp.systemId,
						rating: sp.rating,
						notes: sp.notes,
						recordedAt: sp.recordedAt,
					})),
				})),
				followUps: followUps.map((fu) => ({
					id: fu.id,
					versionNumber: fu.versionNumber,
					createdAt: fu.createdAt,
					sectionC: fu.sectionC,
					sectionD: fu.sectionD,
					sectionE: fu.sectionE,
					sensoryProfiles: fu.sensoryProfiles.map((sp) => ({
						systemId: sp.systemId,
						rating: sp.rating,
						notes: sp.notes,
						recordedAt: sp.recordedAt,
					})),
					progressEntries: fu.progressEntries.map((pe) => ({
						id: pe.id,
						goalId: pe.goalId,
						attainmentPct: pe.attainmentPct,
						status: pe.status,
						evidenceNotes: pe.evidenceNotes,
						recordedAt: pe.recordedAt,
					})),
				})),
				goals: goals.map((g) => ({
					id: g.id,
					description: g.description,
					horizon: g.horizon,
					targetAttainmentPct: g.targetAttainmentPct,
					currentAttainmentPct: g.currentAttainmentPct,
					status: g.status,
					progressEntries: g.progressEntries.map((pe) => ({
						id: pe.id,
						attainmentPct: pe.attainmentPct,
						status: pe.status,
						evidenceNotes: pe.evidenceNotes,
						recordedAt: pe.recordedAt,
					})),
				})),
				sessions: sessions.map((s) => {
					const scored = s.result?.scored as { score: number } | null;
					return {
						id: s.id,
						scheduledDate: s.scheduledDate,
						status: s.status,
						notes: s.notes,
						score: scored?.score ?? null,
					};
				}),
			};
		}),
});
