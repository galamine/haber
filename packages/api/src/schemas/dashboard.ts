import { z } from "zod";

// ── Child dashboard input ──────────────────────────────────────────────────

export const ChildDashboardInput = z.object({
	childId: z.string(),
});

// ── Milestone radar ────────────────────────────────────────────────────────

export const MilestoneRadarDataSchema = z.object({
	versionNumber: z.number().int(),
	recordedAt: z.date(),
	milestones: z.array(
		z.object({
			milestoneId: z.string(),
			attained: z.boolean(),
		}),
	),
});

// ── Sensory delta history ──────────────────────────────────────────────────

export const SensoryDeltaHistorySchema = z.array(
	z.object({
		systemId: z.string(),
		dataPoints: z.array(
			z.object({
				recordedAt: z.date(),
				rating: z.number().int(),
				source: z.enum(["initial", "followUp"]),
			}),
		),
	}),
);

// ── Game score trends ──────────────────────────────────────────────────────

export const GameScoreTrendsInput = z.object({
	childId: z.string(),
	gameId: z.string().optional(),
});

export const GameScoreTrendSchema = z.array(
	z.object({
		date: z.date(),
		gameId: z.string(),
		gameName: z.string(),
		score: z.number(),
		rawMetrics: z.any().nullable(),
	}),
);

// ── Session calendar ───────────────────────────────────────────────────────

export const SessionCalendarDataSchema = z.record(
	z.string(),
	z.array(
		z.object({
			id: z.string(),
			scheduledDate: z.date(),
			status: z.string(),
		}),
	),
);

// ── Notes timeline ─────────────────────────────────────────────────────────

export const NotesTimelineEntrySchema = z.object({
	date: z.date(),
	source: z.enum(["session", "assessment", "followUp"]),
	section: z.string().optional(),
	content: z.string(),
});

// ── Child snapshot ─────────────────────────────────────────────────────────

export const ChildSnapshotSchema = z.object({
	name: z.string(),
	age: z.number(),
	opNumber: z.string(),
	activePlan: z
		.object({ id: z.string(), name: z.string(), status: z.string() })
		.nullable(),
	nextSession: z.date().nullable(),
	attendancePct: z.number(),
});

// ── Clinic summary ─────────────────────────────────────────────────────────

export const ClinicSummarySchema = z.object({
	activeChildren: z.number(),
	sessionsToday: z.number(),
	sessionsThisWeek: z.number(),
	roomUtilisation: z.object({
		booked: z.number(),
		total: z.number(),
	}),
	therapistLoad: z.array(
		z.object({
			therapistId: z.string(),
			name: z.string(),
			count: z.number(),
		}),
	),
	planAdherenceRate: z.number(),
	topCategoriesByActivity: z.array(
		z.object({
			categoryId: z.string(),
			name: z.string(),
			sessionCount: z.number(),
		}),
	),
});

// ── Platform summary ───────────────────────────────────────────────────────

export const PlatformSummarySchema = z.object({
	clinicData: z.array(
		z.object({
			name: z.string(),
			createdAt: z.date(),
			activeChildren: z.number(),
			activeTherapists: z.number(),
			sessionsThisMonth: z.number(),
		}),
	),
	totalChildren: z.number(),
	totalSessionsThisMonth: z.number(),
	newClinicsThisMonth: z.number(),
});
