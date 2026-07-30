import { protectedProcedure, router } from "@haber-final/api";
import prisma from "@haber-final/db";
import { TRPCError } from "@trpc/server";
import { aiExtractor } from "../lib/ai-extractor";
import { sarvamSTT } from "../lib/sarvam-stt";
import {
	GetFormSchemaInput,
	LogOverrideInput,
	ProcessAudioChunkInput,
	SessionIdInput,
	StartSessionInput,
} from "../schemas/ai";
import { formRegistry } from "../schemas/form-registry";

async function getTranscriptHistory(sessionId: string): Promise<string | null> {
	const session = await prisma.conversationSession.findUnique({
		where: { id: sessionId },
		select: { transcriptHistory: true },
	});
	return session?.transcriptHistory as string | null;
}

async function saveTranscriptHistory(
	sessionId: string,
	transcript: string,
): Promise<void> {
	await prisma.conversationSession.update({
		where: { id: sessionId },
		data: { transcriptHistory: transcript },
	});
}

export const aiRouter = router({
	startSession: protectedProcedure
		.input(StartSessionInput)
		.mutation(async ({ input }) => {
			return prisma.conversationSession.create({
				data: {
					assessmentId: input.assessmentId,
					assessmentType: input.assessmentType,
				},
			});
		}),

	pauseSession: protectedProcedure
		.input(SessionIdInput)
		.mutation(async ({ input }) => {
			const session = await prisma.conversationSession.findUnique({
				where: { id: input.sessionId },
			});
			if (!session) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Session not found",
				});
			}
			return prisma.conversationSession.update({
				where: { id: input.sessionId },
				data: { status: "paused" },
			});
		}),

	resumeSession: protectedProcedure
		.input(SessionIdInput)
		.mutation(async ({ input }) => {
			const session = await prisma.conversationSession.findUnique({
				where: { id: input.sessionId },
			});
			if (!session) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Session not found",
				});
			}
			return prisma.conversationSession.update({
				where: { id: input.sessionId },
				data: { status: "active" },
			});
		}),

	endSession: protectedProcedure
		.input(SessionIdInput)
		.mutation(async ({ input }) => {
			const session = await prisma.conversationSession.findUnique({
				where: { id: input.sessionId },
			});
			if (!session) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Session not found",
				});
			}
			return prisma.conversationSession.update({
				where: { id: input.sessionId },
				data: { status: "completed", endedAt: new Date() },
			});
		}),

	getSession: protectedProcedure
		.input(SessionIdInput)
		.query(async ({ input }) => {
			const session = await prisma.conversationSession.findUnique({
				where: { id: input.sessionId },
				include: {
					draftValues: { where: { status: "active" } },
					overrides: { orderBy: { overrideAt: "desc" } },
				},
			});
			if (!session) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Session not found",
				});
			}
			return session;
		}),

	getFormSchema: protectedProcedure
		.input(GetFormSchemaInput)
		.query(async ({ input }) => {
			return input.assessmentType === "initial"
				? formRegistry.initialAssessment
				: formRegistry.followUpAssessment;
		}),

	processAudioChunk: protectedProcedure
		.input(ProcessAudioChunkInput)
		.mutation(async ({ input }) => {
			const session = await prisma.conversationSession.findUnique({
				where: { id: input.sessionId },
			});
			if (!session) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Session not found",
				});
			}
			if (session.status !== "active") {
				return { drafts: [], transcriptSoFar: "" };
			}

			const audioBuffer = Buffer.from(input.audioData, "base64");

			const transcriptText = await sarvamSTT.transcribeStream(
				audioBuffer,
				() => {},
			);

			const existingTranscript = await getTranscriptHistory(input.sessionId);
			const fullTranscript = existingTranscript
				? `${existingTranscript} ${transcriptText}`
				: transcriptText;

			await saveTranscriptHistory(input.sessionId, fullTranscript);

			const assessment =
				session.assessmentType === "initial"
					? await prisma.initialAssessment.findUnique({
							where: { id: session.assessmentId },
						})
					: await prisma.followUpAssessment.findUnique({
							where: { id: session.assessmentId },
						});

			let childName: string | undefined;
			if (assessment) {
				const child = await prisma.child.findUnique({
					where: { id: assessment.childId },
					select: { fullName: true },
				});
				childName = child?.fullName;
			}

			const facts = await aiExtractor.extractFacts(
				fullTranscript,
				session.assessmentType as "initial" | "follow-up",
				{ childName },
			);

			const existingDrafts = await prisma.aIDraftValue.findMany({
				where: { sessionId: input.sessionId, status: "active" },
			});

			const fieldMap = aiExtractor.mapToFields(facts);

			const storedDrafts = await prisma.$transaction(async (tx) => {
				const drafts = [];
				for (const [fieldId, fact] of fieldMap.entries()) {
					const existingDraft = existingDrafts.find(
						(d) => d.fieldId === fieldId,
					);

					if (existingDraft) {
						await tx.aIDraftValue.update({
							where: { id: existingDraft.id },
							data: { status: "superseded" },
						});
					}

					const newDraft = await tx.aIDraftValue.create({
						data: {
							sessionId: input.sessionId,
							fieldId,
							value: fact.value as object,
							confidence: fact.confidence,
							sourceText: fact.sourceText,
						},
					});
					drafts.push(newDraft);
				}
				return drafts;
			});

			return {
				drafts: storedDrafts.map((d) => ({
					id: d.id,
					fieldId: d.fieldId,
					value: d.value,
					confidence: d.confidence,
					sourceText: d.sourceText,
					status: d.status,
					createdAt: d.createdAt,
				})),
				transcriptSoFar: fullTranscript,
			};
		}),

	logOverride: protectedProcedure
		.input(LogOverrideInput)
		.mutation(async ({ input }) => {
			return prisma.aIFieldOverride.create({
				data: {
					sessionId: input.sessionId,
					fieldId: input.fieldId,
					aiValue: input.aiValue as object,
					overrideValue: input.overrideValue as object,
				},
			});
		}),
});
