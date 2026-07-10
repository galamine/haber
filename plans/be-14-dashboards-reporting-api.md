# BE-14 : Dashboards & Reporting API

## Context

Implement aggregation procedures for the per-child dashboard, per-clinic dashboard,
super-admin platform dashboard, and the structured JSON export for progress reports
(`packages/api`, `packages/db`).

Blockers BE-08 (follow-up assessments), BE-09 (goal history), and BE-12 (game results)
are **already implemented** — `FollowUpAssessment`, `SensoryProfile`, `GoalProgressEntry`,
and `GameResult` all exist in the Prisma schema. This plan reuses existing data and code,
adding **no new architectural abstractions**.

Key facts derived from the codebase:
- **Milestone attainment** lives only in `InitialAssessment.sectionC.milestones`
  (`schemas/assessment.ts:3`): `{ milestoneId, achievedAtAgeMonths?, delayed, notes }`.
  Follow-up `sectionC` is sensory-only, so the radar history = each initial-assessment *version* snapshot.
- **Game score** = `GameResult.scored.score` (`schemas/session-execution.ts:30`:
  `{ score: number, rubric_version }`, written by `apps/server/src/index.ts:127`).
- **Assignment check** = `ChildTherapistAssignment` lookup, pattern at `plan.ts:31-41`.
- **Clinic aggregation** = `clinic.platformSummary` at `clinic.ts:120`.
- **Calendar grouping** = `session.getCalendar` at `session.ts:59-87`.
- **Room data** = `SensoryRoom` (active/maintenance) + `RoomBooking` for today's bookings.
- **Category activity** = `GameCategory` → `Game` → `SessionGameAssignment` → `TherapySession`.
- **Notes sources** = `TherapySession.notes` + assessment sections B, D, E, F.
- Per your decision: child procedures are **assigned-therapist only** (CLINIC_ADMIN/SUPER_ADMIN → FORBIDDEN).

## Decisions

| Question | Decision |
|---|---|
| How to avoid duplicating `clinic.platformSummary` logic? | Extract its body into an exported `computeClinicSummaries()`; both `clinic.platformSummary` and `dashboard.platformSummary` call it. |
| Who can call child dashboard procedures? | Assigned therapist only — THERAPIST/STAFF with a `ChildTherapistAssignment`; CLINIC_ADMIN/SUPER_ADMIN get FORBIDDEN. |
| Where does `milestoneRadar` get attainment? | From `initialAssessment.sectionC.milestones` (`attained = !delayed`) across all assessment versions. |
| How does `gameScoreTrends` get the score? | `result.scored.score` (numeric); raw `scored` + `rawMetrics` also returned for client plotting. |
| How to compute `roomUtilisation`? | `SensoryRoom.count({ status: "ACTIVE" })` for total; `RoomBooking.count()` filtered by today for booked. |
| How to compute `topCategoriesByActivity`? | Join `GameCategory` → `Game` → `SessionGameAssignment` → `TherapySession` scoped to this week. |
| How to compute `planAdherenceRate`? | `completed / (completed + absent + manuallyClosed)` for sessions in the current week. |
| Which assessment sections contribute to `notesTimeline`? | Session `notes` + sections B, D, E, F from initial assessments and follow-ups. |

## Files to Create

| File | Purpose |
|---|---|
| `packages/api/src/routers/dashboard.ts` | `dashboard` router: childSnapshot, milestoneRadar, sensoryDeltaHistory, gameScoreTrends, sessionCalendar, notesTimeline, clinicSummary, platformSummary. |
| `packages/api/src/routers/report.ts` | `report` router: childProgress (single-call structured JSON export). |
| `packages/api/src/schemas/dashboard.ts` | Zod schemas: ChildSnapshotSchema, MilestoneRadarDataSchema, SensoryDeltaHistorySchema, GameScoreTrendSchema, ClinicSummarySchema, PlatformSummarySchema, SessionCalendarDataSchema, NotesTimelineEntrySchema. |
| `packages/api/src/schemas/report.ts` | Zod schema: ChildProgressReportSchema. |

## Files to Modify

| File | Change |
|---|---|
| `packages/api/src/routers/index.ts` | Register `dashboard` and `report` under `appRouter`. |
| `packages/api/src/routers/clinic.ts` | Extract the `platformSummary` aggregation body into an exported `computeClinicSummaries()`; `clinic.platformSummary` and `dashboard.platformSummary` both call it (no logic change). |
| `packages/api/src/schemas/index.ts` | Re-export the new dashboard/report schemas if this file aggregates schema exports. |
| `packages/api/src/routers/child.ts` | Export a shared `assertAssignedTherapist(childId, ctx)` helper (reuses the `plan.ts:31-41` assignment check) so child dashboard/report procedures stay DRY. |

## Step 1 — Extract `computeClinicSummaries()` in `clinic.ts`

Move the aggregation currently inside `platformSummary` (`clinic.ts:120-154`) into a reusable
exported function so the new `dashboard.platformSummary` reuses it. Extend the return to
include aggregate totals required by the platform dashboard.

```typescript
export async function computeClinicSummaries() {
	const clinics = await prisma.clinic.findMany({ where: { deletedAt: null } });
	const now = new Date();
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
	const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

	const clinicData = await Promise.all(clinics.map(async (clinic) => {
		const [activeChildren, activeTherapists, sessionsThisMonth] = await Promise.all([
			prisma.child.count({ where: { clinicId: clinic.id, deletedAt: null } }),
			prisma.user.count({ where: { clinicId: clinic.id, role: "THERAPIST" } }),
			prisma.therapySession.count({
				where: { plan: { clinicId: clinic.id }, scheduledDate: { gte: startOfMonth, lt: endOfMonth } },
			}),
		]);
		return { name: clinic.name, createdAt: clinic.createdAt, activeChildren, activeTherapists, sessionsThisMonth };
	}));

	const newClinicsThisMonth = clinics.filter((c) => c.createdAt >= startOfMonth).length;

	return {
		clinicData,
		totalChildren: clinicData.reduce((s, c) => s + c.activeChildren, 0),
		totalSessionsThisMonth: clinicData.reduce((s, c) => s + c.sessionsThisMonth, 0),
		newClinicsThisMonth,
	};
}
// clinic.platformSummary becomes: adminProcedure.query(() => computeClinicSummaries())
```

## Step 2 — Add `assertAssignedTherapist` helper in `child.ts`

Export the existing assignment-check pattern so child dashboard/report procedures reuse it
(therapist/staff must be assigned; others are rejected).

```typescript
export async function assertAssignedTherapist(childId: string, ctx: { auth: AuthUser }) {
	if (ctx.auth.role !== "THERAPIST" && ctx.auth.role !== "STAFF") {
		throw new TRPCError({ code: "FORBIDDEN" });
	}
	const assigned = await prisma.childTherapistAssignment.findFirst({
		where: { childId, therapistId: ctx.auth.userId },
	});
	if (!assigned) throw new TRPCError({ code: "FORBIDDEN" });
}
```

## Step 3 — Create `packages/api/src/schemas/dashboard.ts`

Define the Zod output schemas listed in the Files-to-Create table, shaped to match the
aggregations below. Key schema additions vs the issue:

```typescript
export const ChildSnapshotSchema = z.object({
	name: z.string(),
	age: z.number(),
	opNumber: z.string(),
	activePlan: z.object({ id: z.string(), name: z.string(), status: z.string() }).nullable(),
	nextSession: z.date().nullable(),
	attendancePct: z.number(),
});

export const ClinicSummarySchema = z.object({
	activeChildren: z.number(),
	sessionsToday: z.number(),
	sessionsThisWeek: z.number(),
	roomUtilisation: z.object({ booked: z.number(), total: z.number() }),
	therapistLoad: z.array(z.object({ therapistId: z.string(), name: z.string(), count: z.number() })),
	planAdherenceRate: z.number(),
	topCategoriesByActivity: z.array(z.object({ categoryId: z.string(), name: z.string(), sessionCount: z.number() })),
});

export const PlatformSummarySchema = z.object({
	clinicData: z.array(z.object({
		name: z.string(),
		createdAt: z.date(),
		activeChildren: z.number(),
		activeTherapists: z.number(),
		sessionsThisMonth: z.number(),
	})),
	totalChildren: z.number(),
	totalSessionsThisMonth: z.number(),
	newClinicsThisMonth: z.number(),
});
```

## Step 4 — Create `packages/api/src/routers/dashboard.ts`

Implement all eight procedures composing existing queries:

```typescript
// childSnapshot
const plan = await prisma.treatmentPlan.findFirst({ where: { childId, isActive: true } });
const sessions = await prisma.therapySession.findMany({
	where: { planId: plan!.id, status: { in: ["COMPLETED", "ABSENT"] } },
});
const completed = sessions.filter((s) => s.status === "COMPLETED").length;
const attendancePct = sessions.length ? (completed / sessions.length) * 100 : 0;

// nextSession — first pending session on or after today
const nextSession = await prisma.therapySession.findFirst({
	where: { childId, status: "PENDING", scheduledDate: { gte: new Date() } },
	orderBy: { scheduledDate: "asc" },
	select: { scheduledDate: true },
});

// milestoneRadar — sectionC.milestones across initial-assessment versions
const assessments = await prisma.initialAssessment.findMany({
	where: { childId }, orderBy: { versionNumber: "asc" },
});
// map each: { versionNumber, recordedAt, milestones: [{ milestoneId, label, attained: !delayed }] }

// sensoryDeltaHistory — initial sensoryProfiles + each follow-up sensoryProfiles
const initialProfiles = await prisma.sensoryProfile.findMany({
	where: { assessment: { childId } }, orderBy: { recordedAt: "asc" },
});
const followUpProfiles = await prisma.sensoryProfile.findMany({
	where: { followUp: { childId } }, orderBy: { recordedAt: "asc" },
});
// merge and group by systemId, return per-system time series

// gameScoreTrends — completed sessions with GameResult
const sessionsWithResults = await prisma.therapySession.findMany({
	where: { childId, status: "COMPLETED", result: { isNot: null } },
	include: { result: true, gameAssignments: { include: { gameVersion: { include: { game: true } } } } },
});
// map: { date, gameId, gameName, score: result.scored.score, rawMetrics: result.rawMetrics }

// sessionCalendar — reuse session.getCalendar date-range + grouping (with assigned-therapist check)
const startDate = new Date(year, month - 1, 1);
const endDate = new Date(year, month, 0, 23, 59, 59, 999);
const sessions = await prisma.therapySession.findMany({
	where: { childId, scheduledDate: { gte: startDate, lte: endDate } },
	orderBy: { scheduledDate: "asc" },
	include: { gameAssignments: { orderBy: { order: "asc" } } },
});
// group by date key, same pattern as session.ts:77-84

// notesTimeline — session notes + assessment section B, D, E, F notes
const sessionNotes = await prisma.therapySession.findMany({
	where: { childId, notes: { not: null } },
	select: { notes: true, scheduledDate: true, createdAt: true },
});
const initialAssessments = await prisma.initialAssessment.findMany({
	where: { childId },
	select: { sectionB: true, sectionD: true, sectionE: true, sectionF: true, createdAt: true },
});
const followUps = await prisma.followUpAssessment.findMany({
	where: { childId },
	select: { sectionD: true, sectionE: true, createdAt: true },
});
// merge, sort by date, return as NotesTimelineEntry[]

// clinicSummary — clinicAdminProcedure
const today = new Date(); today.setHours(0,0,0,0);
const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
const startOfWeek = /* start of current week */;
const endOfWeek = /* end of current week */;

const [activeChildren, sessionsToday, sessionsThisWeek] = await Promise.all([
	prisma.child.count({ where: { clinicId: ctx.auth.tenantId!, deletedAt: null } }),
	prisma.therapySession.count({
		where: { plan: { clinicId: ctx.auth.tenantId! }, scheduledDate: { gte: today, lt: tomorrow } },
	}),
	prisma.therapySession.count({
		where: { plan: { clinicId: ctx.auth.tenantId! }, scheduledDate: { gte: startOfWeek, lte: endOfWeek } },
	}),
]);

// roomUtilisation
const totalRooms = await prisma.sensoryRoom.count({
	where: { clinicId: ctx.auth.tenantId!, status: "ACTIVE" },
});
const activeRoomIds = (await prisma.sensoryRoom.findMany({
	where: { clinicId: ctx.auth.tenantId!, status: "ACTIVE" },
	select: { id: true },
})).map((r) => r.id);
const bookedToday = await prisma.roomBooking.count({
	where: { roomId: { in: activeRoomIds }, scheduledDate: { gte: today, lt: tomorrow } },
});

// therapistLoad
const therapistSessions = await prisma.therapySession.groupBy({
	by: ["assignedTherapistId"],
	where: { plan: { clinicId: ctx.auth.tenantId! }, scheduledDate: { gte: today, lt: tomorrow }, assignedTherapistId: { not: null } },
	_count: true,
});

// planAdherenceRate
const weekSessions = await prisma.therapySession.groupBy({
	by: ["status"],
	where: { plan: { clinicId: ctx.auth.tenantId! }, scheduledDate: { gte: startOfWeek, lte: endOfWeek } },
});
const total = weekSessions.reduce((s, g) => s + g._count, 0);
const completed = weekSessions.find((g) => g.status === "COMPLETED")?._count ?? 0;
const planAdherenceRate = total > 0 ? (completed / total) * 100 : 0;

// topCategoriesByActivity
const categoryActivity = await prisma.gameCategory.findMany({
	where: { clinicId: ctx.auth.tenantId! },
	include: { games: { include: {
		sessionAssignments: { where: { session: { scheduledDate: { gte: startOfWeek, lte: endOfWeek } } }, select: { id: true } },
	} } },
});
const topCategoriesByActivity = categoryActivity
	.map((cat) => ({ categoryId: cat.id, name: cat.name, sessionCount: cat.games.reduce((s, g) => s + g.sessionAssignments.length, 0) }))
	.filter((c) => c.sessionCount > 0)
	.sort((a, b) => b.sessionCount - a.sessionCount);

// platformSummary — adminProcedure calling computeClinicSummaries()
const summary = await computeClinicSummaries();
// summary already contains { clinicData, totalChildren, totalSessionsThisMonth, newClinicsThisMonth }
```

## Step 5 — Create `packages/api/src/schemas/report.ts` and `report.ts`

`ChildProgressReportSchema` wraps the composed child data; `report.childProgress` calls
`assertAssignedTherapist` then aggregates: child summary (`getChildForRead`), all assessments
+ follow-ups (with `sensoryProfiles`, `goalProgressEntries`), goals + `goalProgressEntries`,
sensory deltas, game score trends, and the plan timeline — in a single response.

## Step 6 — Register routers in `index.ts`

```typescript
import { dashboardRouter } from "./dashboard";
import { reportRouter } from "./report";
// inside appRouter:
dashboard: dashboardRouter,
report: reportRouter,
```

## Verification

- [ ] `dashboard.childSnapshot` returns correct attendance % (completed / total non-pending sessions) and `nextSession` date.
- [ ] `dashboard.sensoryDeltaHistory` returns a data point for the initial assessment and each follow-up.
- [ ] `dashboard.gameScoreTrends` returns one data point per completed session with a game result.
- [ ] `dashboard.clinicSummary.roomUtilisation` reflects booked rooms vs total active rooms today.
- [ ] `dashboard.clinicSummary` includes `planAdherenceRate`, `therapistLoad`, and `topCategoriesByActivity`.
- [ ] `dashboard.platformSummary` returns `totalChildren`, `totalSessionsThisMonth`, `newClinicsThisMonth` across all clinics (SuperAdmin only).
- [ ] `report.childProgress` returns all assessment, follow-up, goal, and session data in one call.
- [ ] Therapist calling `dashboard.clinicSummary` receives `FORBIDDEN`.
- [ ] `pnpm check-types` passes.

## Blocked by

- None — BE-08, BE-09, and BE-12 are already implemented in the schema.
