import prisma from "@haber-final/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { AuthUser } from "../context";
import { protectedProcedure, router } from "../index";
import {
	AddGameInput,
	CreatePlanInput,
	type ModificationDecisionInput,
	ModifyPlanInput,
	ReorderGamesInput,
	UpdateGameInput,
} from "../schemas/plan";
import { getChildForRead } from "./child";

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

async function applyPlanModificationDecisions(
	tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
	newPlanId: string,
	decisions: z.infer<typeof ModificationDecisionInput>[],
) {
	for (const d of decisions) {
		if (d.action === "CLOSE") {
			await tx.goal.update({
				where: { id: d.goalId },
				data: { status: "DISCONTINUED" },
			});
		} else if (d.action === "CARRY_OVER") {
			const old = await tx.goal.findUniqueOrThrow({ where: { id: d.goalId } });
			const next = await tx.goal.create({
				data: {
					treatmentPlanId: newPlanId,
					description: old.description,
					horizon: old.horizon,
					targetAttainmentPct: old.targetAttainmentPct,
					currentAttainmentPct: old.currentAttainmentPct,
					status: old.status,
				},
			});
			await tx.goal.update({
				where: { id: d.goalId },
				data: { supersededByGoalId: next.id },
			});
		} else if (d.action === "MODIFY") {
			const old = await tx.goal.findUniqueOrThrow({ where: { id: d.goalId } });
			const next = await tx.goal.create({
				data: {
					treatmentPlanId: newPlanId,
					description: d.newDescription ?? old.description,
					horizon: d.newHorizon ?? old.horizon,
					targetAttainmentPct:
						d.newTargetAttainmentPct ?? old.targetAttainmentPct,
					currentAttainmentPct: 0,
					status: "IN_PROGRESS",
				},
			});
			await tx.goal.update({
				where: { id: d.goalId },
				data: { supersededByGoalId: next.id },
			});
		}
	}
}

export const planRouter: ReturnType<typeof router> = router({
	create: protectedProcedure
		.input(CreatePlanInput)
		.mutation(async ({ input, ctx }) => {
			await getChildForRead(input.childId, ctx);

			const planData = {
				childId: input.childId,
				name: input.name,
				programLengthWeeks: input.programLengthWeeks,
				phases: (input.phases ?? []) as unknown as Parameters<
					typeof prisma.treatmentPlan.create
				>[0]["data"]["phases"],
				startDate: input.startDate,
				targetMilestones: input.targetMilestones ?? [],
				sessionDurationMinutes: input.sessionDurationMinutes ?? 60,
				status: "DRAFT" as const,
				isActive: false,
				versionNumber: 1,
				parentPlanId: null,
				sourcePresetId: input.presetId ?? null,
				clinicId: ctx.auth.tenantId!,
				createdById: ctx.auth.userId,
			};

			return prisma.$transaction(async (tx) => {
				const plan = await tx.treatmentPlan.create({ data: planData });

				if (input.presetId) {
					const { PLAN_PRESETS } = await import("../index");
					const preset = PLAN_PRESETS.find(
						(p) => p.preset_id === input.presetId,
					);
					if (!preset) {
						throw new TRPCError({
							code: "BAD_REQUEST",
							message: `Preset not found: ${input.presetId}`,
						});
					}

					const goalsToCreate = [
						...preset.short_term_goals_template.map((description: string) => ({
							treatmentPlanId: plan.id,
							description,
							horizon: "SHORT_TERM" as const,
						})),
						...preset.long_term_goals_template.map((description: string) => ({
							treatmentPlanId: plan.id,
							description,
							horizon: "LONG_TERM" as const,
						})),
					];

					await tx.goal.createMany({ data: goalsToCreate });
				}

				return plan;
			});
		}),

	get: protectedProcedure
		.input(z.object({ planId: z.string() }))
		.query(async ({ input, ctx }) => {
			return getPlanForTherapist(input.planId, ctx);
		}),

	list: protectedProcedure
		.input(z.object({ childId: z.string() }))
		.query(async ({ input, ctx }) => {
			await getChildForRead(input.childId, ctx);
			return prisma.treatmentPlan.findMany({
				where: { childId: input.childId },
				orderBy: { versionNumber: "asc" },
			});
		}),

	listActive: protectedProcedure
		.input(z.object({ childId: z.string() }))
		.query(async ({ input, ctx }) => {
			await getChildForRead(input.childId, ctx);
			return prisma.treatmentPlan.findMany({
				where: { childId: input.childId, isActive: true },
				orderBy: { versionNumber: "asc" },
			});
		}),

	addGame: protectedProcedure
		.input(AddGameInput)
		.mutation(async ({ input, ctx }) => {
			await getPlanForTherapist(input.planId, ctx);

			const gameVersion = await prisma.gameVersion.findUnique({
				where: { id: input.gameVersionId },
			});
			if (!gameVersion) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Game version not found",
				});
			}

			const lastAssignment = await prisma.planGameAssignment.findFirst({
				where: { planId: input.planId },
				orderBy: { order: "desc" },
			});
			const nextOrder = (lastAssignment?.order ?? 0) + 1;

			return prisma.planGameAssignment.create({
				data: {
					planId: input.planId,
					gameVersionId: input.gameVersionId,
					durationSeconds: input.durationSeconds,
					repetitions: input.repetitions,
					frequencyPerWeek: input.frequencyPerWeek,
					instructions: input.instructions,
					appliesToPhase: input.appliesToPhase,
					order: nextOrder,
				},
			});
		}),

	removeGame: protectedProcedure
		.input(z.object({ assignmentId: z.string() }))
		.mutation(async ({ input, ctx }) => {
			const assignment = await prisma.planGameAssignment.findUnique({
				where: { id: input.assignmentId },
			});
			if (!assignment) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			await getPlanForTherapist(assignment.planId, ctx);

			return prisma.planGameAssignment.delete({
				where: { id: input.assignmentId },
			});
		}),

	updateGame: protectedProcedure
		.input(UpdateGameInput)
		.mutation(async ({ input, ctx }) => {
			const assignment = await prisma.planGameAssignment.findUnique({
				where: { id: input.assignmentId },
			});
			if (!assignment) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			await getPlanForTherapist(assignment.planId, ctx);

			const updateData: Record<string, unknown> = {};
			if (input.durationSeconds !== undefined)
				updateData.durationSeconds = input.durationSeconds;
			if (input.repetitions !== undefined)
				updateData.repetitions = input.repetitions;
			if (input.frequencyPerWeek !== undefined)
				updateData.frequencyPerWeek = input.frequencyPerWeek;
			if (input.instructions !== undefined)
				updateData.instructions = input.instructions;
			if (input.appliesToPhase !== undefined)
				updateData.appliesToPhase = input.appliesToPhase;

			return prisma.planGameAssignment.update({
				where: { id: input.assignmentId },
				data: updateData,
			});
		}),

	reorderGames: protectedProcedure
		.input(ReorderGamesInput)
		.mutation(async ({ input, ctx }) => {
			await getPlanForTherapist(input.planId, ctx);

			await prisma.$transaction(
				input.orderedIds.map((id, index) =>
					prisma.planGameAssignment.update({
						where: { id },
						data: { order: index },
					}),
				),
			);
		}),

	checkSessionDuration: protectedProcedure
		.input(z.object({ planId: z.string() }))
		.query(async ({ input, ctx }) => {
			const plan = await getPlanForTherapist(input.planId, ctx);

			const assignments = await prisma.planGameAssignment.findMany({
				where: { planId: input.planId },
			});

			const totalSeconds = assignments.reduce(
				(sum, a) => sum + (a.durationSeconds ?? 0),
				0,
			);
			const limitSeconds = plan.sessionDurationMinutes * 60;

			return {
				totalSeconds,
				limitSeconds,
				exceeds: totalSeconds > limitSeconds,
			};
		}),

	activate: protectedProcedure
		.input(z.object({ planId: z.string() }))
		.mutation(async ({ input, ctx }) => {
			const plan = await getPlanForTherapist(input.planId, ctx);

			if (plan.status !== "DRAFT" && plan.status !== "PAUSED") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Plan must be in DRAFT or PAUSED status to activate",
				});
			}

			return prisma.treatmentPlan.update({
				where: { id: input.planId },
				data: { status: "ACTIVE", isActive: true },
			});
		}),

	pause: protectedProcedure
		.input(z.object({ planId: z.string() }))
		.mutation(async ({ input, ctx }) => {
			const plan = await getPlanForTherapist(input.planId, ctx);

			if (plan.status !== "ACTIVE") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Plan must be ACTIVE to pause",
				});
			}

			return prisma.treatmentPlan.update({
				where: { id: input.planId },
				data: { status: "PAUSED" },
			});
		}),

	resume: protectedProcedure
		.input(z.object({ planId: z.string() }))
		.mutation(async ({ input, ctx }) => {
			const plan = await getPlanForTherapist(input.planId, ctx);

			if (plan.status !== "PAUSED") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Plan must be PAUSED to resume",
				});
			}

			return prisma.treatmentPlan.update({
				where: { id: input.planId },
				data: { status: "ACTIVE" },
			});
		}),

	extend: protectedProcedure
		.input(
			z.object({
				planId: z.string(),
				programLengthWeeks: z.number().int().positive(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			await getPlanForTherapist(input.planId, ctx);

			return prisma.treatmentPlan.update({
				where: { id: input.planId },
				data: { programLengthWeeks: input.programLengthWeeks },
			});
		}),

	close: protectedProcedure
		.input(
			z.object({
				planId: z.string(),
				closureReason: z.string(),
				outcomeSummary: z.string(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const plan = await getPlanForTherapist(input.planId, ctx);

			if (plan.status === "CLOSED") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Plan is already closed",
				});
			}

			return prisma.treatmentPlan.update({
				where: { id: input.planId },
				data: {
					status: "CLOSED",
					isActive: false,
					closureReason: input.closureReason,
					outcomeSummary: input.outcomeSummary,
				},
			});
		}),

	modify: protectedProcedure
		.input(ModifyPlanInput)
		.mutation(async ({ input, ctx }) => {
			const current = await getPlanForTherapist(input.planId, ctx);

			if (current.status === "CLOSED") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Cannot modify a closed plan",
				});
			}

			const currentAssignments = await prisma.planGameAssignment.findMany({
				where: { planId: current.id },
			});

			const newPlan = await prisma.$transaction(async (tx) => {
				await tx.treatmentPlan.update({
					where: { id: current.id },
					data: { isActive: false },
				});

				const created = await tx.treatmentPlan.create({
					data: {
						childId: current.childId,
						clinicId: current.clinicId,
						createdById: ctx.auth.userId,
						name: input.changes.name ?? current.name,
						programLengthWeeks:
							input.changes.programLengthWeeks ?? current.programLengthWeeks,
						phases: (input.changes.phases ?? current.phases) as Parameters<
							typeof prisma.treatmentPlan.create
						>[0]["data"]["phases"],
						startDate: input.changes.startDate ?? current.startDate,
						targetMilestones:
							input.changes.targetMilestones ?? current.targetMilestones,
						sessionDurationMinutes:
							input.changes.sessionDurationMinutes ??
							current.sessionDurationMinutes,
						status: "ACTIVE",
						isActive: true,
						versionNumber: current.versionNumber + 1,
						parentPlanId: current.id,
						sourcePresetId: current.sourcePresetId,
					},
				});

				await tx.planGameAssignment.createMany({
					data: currentAssignments.map((a) => ({
						planId: created.id,
						gameVersionId: a.gameVersionId,
						durationSeconds: a.durationSeconds,
						repetitions: a.repetitions,
						frequencyPerWeek: a.frequencyPerWeek,
						instructions: a.instructions,
						appliesToPhase: a.appliesToPhase,
						order: a.order,
					})),
				});

				await applyPlanModificationDecisions(
					tx,
					created.id,
					input.goalDecisions,
				);

				return created;
			});

			return newPlan;
		}),

	listPresets: protectedProcedure.query(async () => {
		const { PLAN_PRESETS } = await import("../index");
		return PLAN_PRESETS;
	}),
});
