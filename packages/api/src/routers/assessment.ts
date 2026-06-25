import prisma from "@haber-final/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, router } from "../index";
import { CreateAssessmentInput } from "../schemas/assessment";
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
		signedAt: new Date().toISOString(),
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
});
