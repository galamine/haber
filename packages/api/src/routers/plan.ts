import prisma from "@haber-final/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { AuthUser } from "../context";
import { protectedProcedure, router } from "../index";
import { CreatePlanInput } from "../schemas/plan";
import { getChildForRead } from "./child";

export async function getPlanForTherapist(
	planId: string,
	ctx: { auth: AuthUser },
) {
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
		if (!isAssigned)
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You are not assigned to this child",
			});
	}
	return plan;
}

export const planRouter = router({
	create: protectedProcedure
		.input(CreatePlanInput)
		.mutation(async ({ input, ctx }) => {
			if (!ctx.auth.tenantId) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "Tenant ID is required",
				});
			}
			await getChildForRead(input.childId, ctx);

			const planData = {
				childId: input.childId,
				name: input.name,
				programLengthWeeks: input.programLengthWeeks,
				startDate: input.startDate,
				targetMilestones: input.targetMilestones ?? [],
				sessionDurationMinutes: input.sessionDurationMinutes ?? 60,
				status: input.publish ? ("ACTIVE" as const) : ("DRAFT" as const),
				isActive: input.publish ? true : false,
				versionNumber: 1,
				parentPlanId: null,
				sourcePresetId: input.presetId ?? null,
				clinicId: ctx.auth.tenantId,
				createdById: ctx.auth.userId,
			};

			return prisma.$transaction(async (tx) => {
				const plan = await tx.treatmentPlan.create({ data: planData });

				let goalTemplates: {
					short_term: string[];
					long_term: string[];
				} | null = null;

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

					goalTemplates = {
						short_term: preset.short_term_goals_template,
						long_term: preset.long_term_goals_template,
					};
				} else if (input.customGoals) {
					goalTemplates = input.customGoals;
				}

				if (goalTemplates) {
					const goalsToCreate = [
						...goalTemplates.short_term.map((description: string) => ({
							treatmentPlanId: plan.id,
							description,
							horizon: "SHORT_TERM" as const,
						})),
						...goalTemplates.long_term.map((description: string) => ({
							treatmentPlanId: plan.id,
							description,
							horizon: "LONG_TERM" as const,
						})),
					];

					if (goalsToCreate.length > 0) {
						await tx.goal.createMany({ data: goalsToCreate });
					}
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

	activate: protectedProcedure
		.input(z.object({ planId: z.string() }))
		.mutation(async ({ input, ctx }) => {
			const plan = await getPlanForTherapist(input.planId, ctx);

			if (plan.status !== "DRAFT") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Plan must be in DRAFT status to activate",
				});
			}

			return prisma.treatmentPlan.update({
				where: { id: plan.id },
				data: { status: "ACTIVE", isActive: true },
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

	listPresets: protectedProcedure.query(async () => {
		const { PLAN_PRESETS } = await import("../index");
		return PLAN_PRESETS;
	}),
});
