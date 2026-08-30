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
	sessionsToday: z.object({
		total: z.number(),
		pending: z.number(),
		inProgress: z.number(),
		completed: z.number(),
		absent: z.number(),
		manuallyClosed: z.number(),
	}),
	sessionsThisWeek: z.number(),
	roomUtilisation: z.object({
		booked: z.number(),
		total: z.number(),
		maintenanceCount: z.number(),
		rooms: z.array(
			z.object({
				id: z.string(),
				name: z.string(),
				code: z.string(),
				status: z.enum(["ACTIVE", "MAINTENANCE"]),
				bookedToday: z.boolean(),
				occupyingTherapist: z.string().nullable(),
			}),
		),
	}),
	therapistLoad: z.array(
		z.object({
			therapistId: z.string(),
			name: z.string(),
			assignedToday: z.number(),
			completedToday: z.number(),
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
	consentBacklog: z.object({
		pendingConsent: z.number(),
		expiredInvitations: z.number(),
	}),
	reviewsDueCount: z.number(),
	retentionRecordsCount: z.number(),
});

// ── Therapist caseload summary ─────────────────────────────────────────────

export const MyCaseloadSummarySchema = z.object({
	activeChildrenCount: z.number(),
	sessionsTodayCount: z.number(),
	sessionsThisWeekCount: z.number(),
	attendancePct: z.number(),
});
