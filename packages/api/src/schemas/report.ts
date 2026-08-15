import { z } from "zod";

export const ChildProgressReportSchema = z.object({
	child: z.object({
		id: z.string(),
		fullName: z.string(),
		opNumber: z.string(),
		dob: z.date(),
		sex: z.string().nullable(),
	}),
	assessments: z.array(
		z.object({
			id: z.string(),
			versionNumber: z.number().int(),
			createdAt: z.date(),
			sectionC: z.any(),
			sensoryProfiles: z.array(
				z.object({
					systemId: z.string(),
					rating: z.number().int(),
					notes: z.string().nullable(),
					recordedAt: z.date(),
				}),
			),
		}),
	),
	followUps: z.array(
		z.object({
			id: z.string(),
			versionNumber: z.number().int(),
			createdAt: z.date(),
			sectionC: z.any(),
			sectionD: z.any(),
			sectionE: z.any(),
			sensoryProfiles: z.array(
				z.object({
					systemId: z.string(),
					rating: z.number().int(),
					notes: z.string().nullable(),
					recordedAt: z.date(),
				}),
			),
			progressEntries: z.array(
				z.object({
					id: z.string(),
					goalId: z.string(),
					attainmentPct: z.number().int(),
					status: z.string(),
					evidenceNotes: z.string().nullable(),
					recordedAt: z.date(),
				}),
			),
		}),
	),
	goals: z.array(
		z.object({
			id: z.string(),
			description: z.string(),
			horizon: z.string(),
			targetAttainmentPct: z.number().int(),
			currentAttainmentPct: z.number().int(),
			status: z.string(),
			progressEntries: z.array(
				z.object({
					id: z.string(),
					attainmentPct: z.number().int(),
					status: z.string(),
					evidenceNotes: z.string().nullable(),
					recordedAt: z.date(),
				}),
			),
		}),
	),
	sessions: z.array(
		z.object({
			id: z.string(),
			scheduledDate: z.date(),
			status: z.string(),
			notes: z.string().nullable(),
			score: z.number().nullable(),
			games: z.array(
				z.object({
					name: z.string(),
					score: z.number().nullable(),
					resultSummary: z.any(),
				}),
			),
		}),
	),
});
