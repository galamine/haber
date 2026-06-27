import prisma from "@haber-final/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { AuthUser } from "../context";
import { protectedProcedure, router } from "../index";
import {
	ApplyPlanModificationDecisionsInput,
	CreateGoalInput,
	UpdateGoalAttainmentInput,
} from "../schemas/goal";

async function getPlanForTherapist(planId: string, ctx: { auth: AuthUser }) {
	const plan = await prisma.treatmentPlan.findFirst({
		where: {
			id: planId,
			...(ctx.auth.role !== "SUPER_ADMIN"
				? { clinicId: ctx.auth.tenantId ?? undefined }
				: {}),
		},
	});
	if (!plan) throw new TRPCError({ code: "NOT_FOUND" });

	if (ctx.auth.role === "THERAPIST" || ctx.auth.role === "STAFF") {
		const child = await prisma.child.findFirst({
			where: { id: plan.childId, deletedAt: null },
		});
		if (!child) throw new TRPCError({ code: "NOT_FOUND" });
		const isAssigned =
			(await prisma.childTherapistAssignment.findFirst({
				where: { childId: plan.childId, therapistId: ctx.auth.userId },
			})) !== null;
		if (!isAssigned) throw new TRPCError({ code: "FORBIDDEN" });
	}
	return plan;
}

async function getGoalForTherapist(goalId: string, ctx: { auth: AuthUser }) {
	const goal = await prisma.goal.findUnique({
		where: { id: goalId },
		include: { plan: true },
	});
	if (!goal) throw new TRPCError({ code: "NOT_FOUND" });
	await getPlanForTherapist(goal.treatmentPlanId, ctx);
	return goal;
}

export const goalRouter: ReturnType<typeof router> = router({
	list: protectedProcedure
		.input(z.object({ treatmentPlanId: z.string() }))
		.query(async ({ input, ctx }) => {
			await getPlanForTherapist(input.treatmentPlanId, ctx);
			return prisma.goal.findMany({
				where: { treatmentPlanId: input.treatmentPlanId },
				orderBy: { createdAt: "asc" },
			});
		}),

	create: protectedProcedure
		.input(CreateGoalInput)
		.mutation(async ({ input, ctx }) => {
			await getPlanForTherapist(input.treatmentPlanId, ctx);
			return prisma.goal.create({
				data: {
					treatmentPlanId: input.treatmentPlanId,
					description: input.description,
					horizon: input.horizon,
					targetAttainmentPct: input.targetAttainmentPct,
					currentAttainmentPct: 0,
					status: "IN_PROGRESS",
				},
			});
		}),

	updateAttainment: protectedProcedure
		.input(UpdateGoalAttainmentInput)
		.mutation(async ({ input, ctx }) => {
			await getGoalForTherapist(input.goalId, ctx);

			return prisma.$transaction(async (tx) => {
				const updatedGoal = await tx.goal.update({
					where: { id: input.goalId },
					data: {
						currentAttainmentPct: input.attainmentPct,
						status: input.status,
					},
				});

				await tx.goalProgressEntry.create({
					data: {
						goalId: input.goalId,
						followUpId: input.followUpId,
						attainmentPct: input.attainmentPct,
						status: input.status,
						evidenceNotes: input.evidenceNotes ?? null,
					},
				});

				return updatedGoal;
			});
		}),

	applyPlanModificationDecisions: protectedProcedure
		.input(ApplyPlanModificationDecisionsInput)
		.mutation(async ({ input, ctx }) => {
			await getPlanForTherapist(input.newPlanId, ctx);

			let continued = 0;
			let modified = 0;
			let added = 0;
			let discontinued = 0;

			await prisma.$transaction(async (tx) => {
				for (const newGoal of input.newGoals ?? []) {
					await tx.goal.create({
						data: {
							treatmentPlanId: input.newPlanId,
							description: newGoal.description,
							horizon: newGoal.horizon ?? "SHORT_TERM",
							targetAttainmentPct: newGoal.targetAttainmentPct,
							currentAttainmentPct: 0,
							status: "IN_PROGRESS",
						},
					});
					added++;
				}

				for (const decision of input.decisions) {
					if (decision.action === "add") {
						continue;
					}

					await getGoalForTherapist(decision.goalId, ctx);

					if (decision.action === "continue") {
						const old = await tx.goal.findUniqueOrThrow({
							where: { id: decision.goalId },
						});
						await tx.goal.create({
							data: {
								treatmentPlanId: input.newPlanId,
								description: old.description,
								horizon: old.horizon,
								targetAttainmentPct: old.targetAttainmentPct,
								currentAttainmentPct: old.currentAttainmentPct,
								status: old.status,
							},
						});
						continued++;
					} else if (decision.action === "modify") {
						const old = await tx.goal.findUniqueOrThrow({
							where: { id: decision.goalId },
						});
						const next = await tx.goal.create({
							data: {
								treatmentPlanId: input.newPlanId,
								description: decision.newDescription ?? old.description,
								horizon: decision.newHorizon ?? old.horizon,
								targetAttainmentPct:
									decision.newTargetPct ?? old.targetAttainmentPct,
								currentAttainmentPct: 0,
								status: "IN_PROGRESS",
							},
						});
						await tx.goal.update({
							where: { id: decision.goalId },
							data: {
								status: "DISCONTINUED",
								supersededByGoalId: next.id,
							},
						});
						modified++;
					} else if (decision.action === "discontinue") {
						await tx.goal.update({
							where: { id: decision.goalId },
							data: { status: "DISCONTINUED" },
						});
						discontinued++;
					}
				}
			});

			return { continued, modified, added, discontinued };
		}),

	listProgressHistory: protectedProcedure
		.input(z.object({ goalId: z.string() }))
		.query(async ({ input, ctx }) => {
			await getGoalForTherapist(input.goalId, ctx);
			return prisma.goalProgressEntry.findMany({
				where: { goalId: input.goalId },
				orderBy: { recordedAt: "asc" },
			});
		}),
});
