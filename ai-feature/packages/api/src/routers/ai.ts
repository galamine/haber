import { protectedProcedure, router } from "@haber-final/api";
import prisma from "@haber-final/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { aiExtractor } from "../lib/ai-extractor";
import { sarvamSTT } from "../lib/sarvam-stt";
import {
	CaptureIdInput,
	GetFormSchemaInput,
	LogOverrideInput,
	ProcessAudioChunkInput,
	StartCaptureInput,
} from "../schemas/ai";
import { formRegistry } from "../schemas/form-registry";

async function getTranscriptHistory(captureId: string): Promise<string | null> {
	const capture = await prisma.assessmentCapture.findUnique({
		where: { id: captureId },
		select: { transcriptHistory: true },
	});
	return capture?.transcriptHistory as string | null;
}

async function saveTranscriptHistory(
	captureId: string,
	transcript: string,
): Promise<void> {
	await prisma.assessmentCapture.update({
		where: { id: captureId },
		data: { transcriptHistory: transcript },
	});
}

export const aiRouter = router({
	startCapture: protectedProcedure
		.input(StartCaptureInput)
		.mutation(async ({ input }) => {
			return prisma.assessmentCapture.create({
				data: {
					childId: input.childId,
					assessmentId: input.assessmentId,
					assessmentType: input.assessmentType,
				},
			});
		}),

	pauseCapture: protectedProcedure
		.input(CaptureIdInput)
		.mutation(async ({ input }) => {
			const capture = await prisma.assessmentCapture.findUnique({
				where: { id: input.captureId },
			});
			if (!capture) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Capture not found",
				});
			}
			return prisma.assessmentCapture.update({
				where: { id: input.captureId },
				data: { status: "paused" },
			});
		}),

	resumeCapture: protectedProcedure
		.input(CaptureIdInput)
		.mutation(async ({ input }) => {
			const capture = await prisma.assessmentCapture.findUnique({
				where: { id: input.captureId },
			});
			if (!capture) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Capture not found",
				});
			}
			return prisma.assessmentCapture.update({
				where: { id: input.captureId },
				data: { status: "active" },
			});
		}),

	endCapture: protectedProcedure
		.input(CaptureIdInput)
		.mutation(async ({ input }) => {
			const capture = await prisma.assessmentCapture.findUnique({
				where: { id: input.captureId },
			});
			if (!capture) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Capture not found",
				});
			}
			return prisma.assessmentCapture.update({
				where: { id: input.captureId },
				data: { status: "completed", endedAt: new Date() },
			});
		}),

	getCapture: protectedProcedure
		.input(CaptureIdInput)
		.query(async ({ input }) => {
			const capture = await prisma.assessmentCapture.findUnique({
				where: { id: input.captureId },
				include: {
					draftValues: { where: { status: "active" } },
					overrides: { orderBy: { overrideAt: "desc" } },
				},
			});
			if (!capture) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Capture not found",
				});
			}
			return capture;
		}),

	getActiveCapture: protectedProcedure
		.input(
			z.object({
				childId: z.string(),
				assessmentType: z.enum(["initial", "follow-up"]),
			}),
		)
		.query(async ({ input }) => {
			const capture = await prisma.assessmentCapture.findFirst({
				where: {
					childId: input.childId,
					assessmentType: input.assessmentType,
					status: { in: ["active", "paused"] },
				},
				include: {
					draftValues: { where: { status: "active" } },
					overrides: { orderBy: { overrideAt: "desc" } },
				},
				orderBy: { startedAt: "desc" },
			});
			return capture;
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
			const capture = await prisma.assessmentCapture.findUnique({
				where: { id: input.captureId },
			});
			if (!capture) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Capture not found",
				});
			}
			if (capture.status !== "active") {
				return { drafts: [], transcriptSoFar: "" };
			}

			const audioBuffer = Buffer.from(input.audioData, "base64");

			const transcriptText = await sarvamSTT.transcribeStream(
				audioBuffer,
				() => {},
			);

			const existingTranscript = await getTranscriptHistory(input.captureId);
			const fullTranscript = existingTranscript
				? `${existingTranscript} ${transcriptText}`
				: transcriptText;

			await saveTranscriptHistory(input.captureId, fullTranscript);

			let childName: string | undefined;
			if (capture.assessmentId) {
				const assessment =
					capture.assessmentType === "initial"
						? await prisma.initialAssessment.findUnique({
								where: { id: capture.assessmentId },
							})
						: await prisma.followUpAssessment.findUnique({
								where: { id: capture.assessmentId },
							});

				if (assessment) {
					const child = await prisma.child.findUnique({
						where: { id: assessment.childId },
						select: { fullName: true },
					});
					childName = child?.fullName;
				}
			} else {
				const child = await prisma.child.findUnique({
					where: { id: capture.childId },
					select: { fullName: true },
				});
				childName = child?.fullName;
			}

			const facts = await aiExtractor.extractFacts(
				fullTranscript,
				capture.assessmentType as "initial" | "follow-up",
				{ childName },
			);

			const existingDrafts = await prisma.captureDraftValue.findMany({
				where: { captureId: input.captureId, status: "active" },
			});

			const fieldMap = aiExtractor.mapToFields(facts);

			const storedDrafts = await prisma.$transaction(async (tx) => {
				const drafts = [];
				for (const [fieldId, fact] of fieldMap.entries()) {
					const existingDraft = existingDrafts.find(
						(d) => d.fieldId === fieldId,
					);

					if (existingDraft) {
						await tx.captureDraftValue.update({
							where: { id: existingDraft.id },
							data: { status: "superseded" },
						});
					}

					const newDraft = await tx.captureDraftValue.create({
						data: {
							captureId: input.captureId,
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
			return prisma.captureOverride.create({
				data: {
					captureId: input.captureId,
					fieldId: input.fieldId,
					aiValue: input.aiValue as object,
					overrideValue: input.overrideValue as object,
				},
			});
		}),

	testTranscribe: protectedProcedure
		.input(
			z.object({
				audioData: z.string(),
				assessmentType: z.enum(["initial", "follow-up"]),
			}),
		)
		.mutation(async ({ input }) => {
			const audioBuffer = Buffer.from(input.audioData, "base64");
			const transcript = await sarvamSTT.transcribeFile(audioBuffer);
			const facts = await aiExtractor.extractFacts(
				transcript,
				input.assessmentType,
				{},
			);
			const fieldMap = aiExtractor.mapToFields(facts);
			return {
				transcript,
				extractedFacts: Array.from(fieldMap.entries()).map(
					([fieldId, fact]) => ({
						fieldId,
						value: fact.value,
						confidence: fact.confidence,
						sourceText: fact.sourceText,
					}),
				),
			};
		}),
});
