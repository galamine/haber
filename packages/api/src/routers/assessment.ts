import prisma from "@haber-final/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, router } from "../index";
import {
	CreateAssessmentInput,
	CreateFollowUpInput,
} from "../schemas/assessment";
import { getChildForRead } from "./child";

async function buildCredentialsSnapshot(userId: string): Promise<string> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			credentialsQualifications: true,
			credentialsRegistrationNumber: true,
		},
	});

	return [user?.credentialsQualifications, user?.credentialsRegistrationNumber]
		.filter((part): part is string => !!part?.trim())
		.join(", ");
}

async function createAssessmentVersion(
	input: z.infer<typeof CreateAssessmentInput>,
	ctx: { auth: { userId: string }; ip: string },
	versionNumber: number,
) {
	const sectionH = {
		...input.sectionH,
		therapistIp: ctx.ip,
		guardianIp: ctx.ip,
		therapistCredentials: await buildCredentialsSnapshot(ctx.auth.userId),
	};

	return prisma.$transaction(async (tx) => {
		const assessment = await tx.initialAssessment.create({
			data: {
				childId: input.childId,
				therapistId: ctx.auth.userId,
				versionNumber,
				sectionA: input.sectionA,
				sectionB: input.sectionB,
				sectionC: input.sectionC,
				sectionD: input.sectionD,
				sectionE: input.sectionE,
				sectionF: input.sectionF,
				sectionG: input.sectionG,
				sectionH,
			},
		});

		await tx.sensoryProfile.createMany({
			data: input.sectionD.sensoryProfile.map((r) => ({
				assessmentId: assessment.id,
				systemId: r.systemId,
				rating: r.rating,
				notes: r.notes,
			})),
		});

		return assessment;
	});
}

export const assessmentRouter = router({
	create: protectedProcedure
		.input(CreateAssessmentInput)
		.mutation(async ({ input, ctx }) => {
			const child = await getChildForRead(input.childId, ctx);

			if (child.consentStatus !== "GRANTED") {
				throw new TRPCError({ code: "PRECONDITION_FAILED" });
			}

			const existing = await prisma.initialAssessment.findFirst({
				where: { childId: input.childId },
			});
			if (existing) throw new TRPCError({ code: "CONFLICT" });

			return createAssessmentVersion(input, ctx, 1);
		}),

	get: protectedProcedure
		.input(z.object({ childId: z.string() }))
		.query(async ({ input, ctx }) => {
			await getChildForRead(input.childId, ctx);

			const latest = await prisma.initialAssessment.findFirst({
				where: { childId: input.childId },
				orderBy: { versionNumber: "desc" },
			});
			if (!latest) throw new TRPCError({ code: "NOT_FOUND" });

			return latest;
		}),

	list: protectedProcedure
		.input(z.object({ childId: z.string() }))
		.query(async ({ input, ctx }) => {
			await getChildForRead(input.childId, ctx);

			return prisma.initialAssessment.findMany({
				where: { childId: input.childId },
				orderBy: { versionNumber: "asc" },
			});
		}),

	review: protectedProcedure
		.input(CreateAssessmentInput)
		.mutation(async ({ input, ctx }) => {
			await getChildForRead(input.childId, ctx);

			const latest = await prisma.initialAssessment.findFirst({
				where: { childId: input.childId },
				orderBy: { versionNumber: "desc" },
			});
			if (!latest) throw new TRPCError({ code: "NOT_FOUND" });

			return createAssessmentVersion(input, ctx, latest.versionNumber + 1);
		}),

	createFollowUp: protectedProcedure
		.input(CreateFollowUpInput)
		.mutation(async ({ input, ctx }) => {
			await getChildForRead(input.childId, ctx);

			const initialAssessment = await prisma.initialAssessment.findFirst({
				where: { id: input.initialAssessmentId, childId: input.childId },
			});
			if (!initialAssessment) throw new TRPCError({ code: "NOT_FOUND" });

			const treatmentPlan = await prisma.treatmentPlan.findFirst({
				where: { id: input.treatmentPlanId, childId: input.childId },
			});
			if (!treatmentPlan) throw new TRPCError({ code: "NOT_FOUND" });
			if (!treatmentPlan.isActive) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "treatmentPlanId is not the active plan",
				});
			}

			if (input.previousFollowUpId) {
				const previous = await prisma.followUpAssessment.findFirst({
					where: { id: input.previousFollowUpId, childId: input.childId },
				});
				if (!previous) throw new TRPCError({ code: "NOT_FOUND" });
			}

			const baselineRows = await prisma.sensoryProfile.findMany({
				where: { assessmentId: input.initialAssessmentId },
			});
			const baselineMap = new Map(
				baselineRows.map((r) => [r.systemId, r.rating]),
			);

			const sensoryResults = input.sectionC.sensoryCheck.map((check) => {
				const baseline = baselineMap.get(check.systemId);
				if (baseline === undefined) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: `No baseline sensory profile for systemId ${check.systemId}`,
					});
				}
				return { ...check, baseline, change: check.rating - baseline };
			});

			const sectionF = {
				...input.sectionF,
				therapistIp: ctx.ip,
				guardianIp: ctx.ip,
				therapistCredentials: await buildCredentialsSnapshot(ctx.auth.userId),
			};

			return prisma.$transaction(async (tx) => {
				const followUp = await tx.followUpAssessment.create({
					data: {
						childId: input.childId,
						initialAssessmentId: input.initialAssessmentId,
						treatmentPlanId: input.treatmentPlanId,
						previousFollowUpId: input.previousFollowUpId,
						therapistId: ctx.auth.userId,
						sectionA: input.sectionA,
						sectionB: input.sectionB,
						sectionC: { sensoryCheck: sensoryResults },
						sectionD: input.sectionD,
						sectionE: input.sectionE,
						sectionF,
					},
				});

				await tx.sensoryProfile.createMany({
					data: sensoryResults.map((r) => ({
						followUpId: followUp.id,
						systemId: r.systemId,
						rating: r.rating,
						notes: r.notes,
					})),
				});

				for (const progress of input.sectionB.goalProgress) {
					const goal = await tx.goal.findFirst({
						where: {
							id: progress.goalId,
							treatmentPlanId: input.treatmentPlanId,
						},
					});
					if (!goal) {
						throw new TRPCError({
							code: "NOT_FOUND",
							message: `Goal ${progress.goalId} not found on treatment plan`,
						});
					}

					await tx.goalProgressEntry.create({
						data: {
							goalId: progress.goalId,
							followUpId: followUp.id,
							attainmentPct: progress.attainmentPct,
							status: progress.status,
							evidenceNotes: progress.evidenceNotes,
						},
					});

					await tx.goal.update({
						where: { id: progress.goalId },
						data: {
							currentAttainmentPct: progress.attainmentPct,
							status: progress.status,
						},
					});
				}

				return followUp;
			});
		}),

	getFollowUp: protectedProcedure
		.input(z.object({ followUpId: z.string() }))
		.query(async ({ input, ctx }) => {
			const followUp = await prisma.followUpAssessment.findUnique({
				where: { id: input.followUpId },
			});
			if (!followUp) throw new TRPCError({ code: "NOT_FOUND" });

			await getChildForRead(followUp.childId, ctx);

			return followUp;
		}),

	listFollowUps: protectedProcedure
		.input(z.object({ childId: z.string() }))
		.query(async ({ input, ctx }) => {
			await getChildForRead(input.childId, ctx);

			return prisma.followUpAssessment.findMany({
				where: { childId: input.childId },
				orderBy: { createdAt: "asc" },
			});
		}),

	getFollowUpDelta: protectedProcedure
		.input(z.object({ followUpId: z.string() }))
		.query(async ({ input, ctx }) => {
			const followUp = await prisma.followUpAssessment.findUnique({
				where: { id: input.followUpId },
			});
			if (!followUp) throw new TRPCError({ code: "NOT_FOUND" });

			await getChildForRead(followUp.childId, ctx);

			const sectionC = followUp.sectionC as unknown as {
				sensoryCheck: {
					systemId: string;
					rating: number;
					baseline: number;
					change: number;
				}[];
			};

			return sectionC.sensoryCheck.map((entry) => ({
				system: entry.systemId,
				baseline: entry.baseline,
				current: entry.rating,
				change: entry.change,
			}));
		}),

	getActivePlan: protectedProcedure
		.input(z.object({ childId: z.string() }))
		.query(async ({ input, ctx }) => {
			await getChildForRead(input.childId, ctx);
			return prisma.treatmentPlan.findFirst({
				where: { childId: input.childId, isActive: true },
				include: {
					goals: {
						select: {
							id: true,
							description: true,
							horizon: true,
							status: true,
							targetAttainmentPct: true,
						},
					},
				},
			});
		}),
});
