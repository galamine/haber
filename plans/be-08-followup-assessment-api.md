# BE-08: Follow-Up Assessment Form 2 API

## Context

The *Haber Specialisto* follow-up assessment (Form 2) is conducted every 4–6 sessions. It
re-checks the child's 7-system sensory profile against the **initial assessment's baseline**,
records progress on the goals from the active treatment plan, and captures qualitative
observations + next-period planning notes. It is append-only: every `createFollowUp` call inserts
a brand-new `FollowUpAssessment` row (no versioning/review cycle like BE-07's
`InitialAssessment`).

BE-07 (`InitialAssessment`, `SensoryProfile`) is done. `FollowUpAssessment`, `Goal`,
`GoalProgressEntry`, `TreatmentPlan` models already exist in
`packages/db/prisma/schema/plans.prisma` (from BE-01c), but `FollowUpAssessment` currently has
**no relations** to `SensoryProfile`/`GoalProgressEntry`, and `SensoryProfile` has no
`followUpId`. Small schema additions are needed (no migration files in this repo — `pnpm db:push`
applies changes directly).

BE-09 (Goal Tracking API) and BE-10 (Treatment Plan API) are separate, **not-yet-built** issues —
this task does not depend on them, but it does assume `TreatmentPlan` and `Goal` rows can exist
(created via direct Prisma calls in tests/seed for now, or by BE-09/10 later).

**Decisions confirmed with user:**
1. Sensory delta is computed **only vs. the initial baseline** — no "vs previous follow-up"
   fields, even though the issue mentions loading the previous follow-up's `SensoryProfile`. This
   matches `getFollowUpDelta`'s documented `{ system, baseline, current, change }` shape exactly.
2. `sectionE` (`goalStatusDecisions`, `updatedGoals`) is stored as JSON only — **no `Goal` table
   writes**. That lifecycle (continue/modify/add/discontinue) is BE-09's
   `applyPlanModificationDecisions`.
3. `createFollowUp` validates all linked IDs belong to the child: `initialAssessmentId` (child's
   assessment), `treatmentPlanId` (child's plan, must be `isActive: true`), `previousFollowUpId`
   (if given, child's previous follow-up). Throws `NOT_FOUND`/`BAD_REQUEST` on mismatch.

## Existing facts (verified)

- `packages/db/prisma/schema/clinical.prisma` — `SensoryProfile`:
  ```prisma
  model SensoryProfile {
    id           String   @id @default(cuid())
    assessmentId String?
    systemId     String
    rating       Int
    notes        String?
    recordedAt   DateTime @default(now())
    assessment InitialAssessment? @relation(fields: [assessmentId], references: [id])
  }
  ```
  `assessmentId` is optional (used by BE-07's `InitialAssessment`). No `followUpId` field exists.

- `packages/db/prisma/schema/plans.prisma` — `Goal`, `GoalProgressEntry`, `FollowUpAssessment`,
  `TreatmentPlan`, enums:
  ```prisma
  enum GoalStatus { MET IN_PROGRESS NOT_MET DISCONTINUED }

  model Goal {
    id                   String      @id @default(cuid())
    treatmentPlanId      String
    description          String
    horizon              GoalHorizon
    targetAttainmentPct  Int         @default(100)
    currentAttainmentPct Int         @default(0)
    status               GoalStatus  @default(IN_PROGRESS)
    supersededByGoalId   String?
    createdAt            DateTime    @default(now())
    plan            TreatmentPlan       @relation(fields: [treatmentPlanId], references: [id])
    progressEntries GoalProgressEntry[]
  }

  model GoalProgressEntry {
    id            String     @id @default(cuid())
    goalId        String
    followUpId    String      // plain string, NOT a relation yet
    attainmentPct Int
    status        GoalStatus
    evidenceNotes String?
    recordedAt    DateTime   @default(now())
    goal Goal @relation(fields: [goalId], references: [id])
  }

  model FollowUpAssessment {
    id                  String   @id @default(cuid())
    childId             String
    initialAssessmentId String
    treatmentPlanId     String
    previousFollowUpId  String?
    therapistId         String
    versionNumber       Int      @default(1)
    sectionA Json
    sectionB Json
    sectionC Json
    sectionD Json
    sectionE Json
    sectionF Json
    createdAt DateTime @default(now())
    // no relations yet
  }

  model TreatmentPlan {
    id       String     @id @default(cuid())
    childId  String
    ...
    isActive Boolean    @default(false)
    goals    Goal[]
    ...
  }
  ```

- `packages/api/src/routers/child.ts` exports `getChildForRead(childId, ctx)`:
  - Scopes lookup by `clinicId: ctx.auth.tenantId` (unless `SUPER_ADMIN`); throws `NOT_FOUND` if
    missing/wrong tenant.
  - For `THERAPIST`/`STAFF`, throws `FORBIDDEN` unless `child.preferredTherapistId === userId` or
    a `ChildTherapistAssignment` row exists for `(childId, userId)`.
  - This single call satisfies tenant-scoping + "assigned therapist" + the `FORBIDDEN`
    acceptance criterion for all four new procedures.

- `packages/api/src/routers/assessment.ts` (BE-07) already has:
  - `buildCredentialsSnapshot(userId)` — reads `User.credentialsQualifications` +
    `credentialsRegistrationNumber`, joins into a string. Reuse directly for
    `sectionF.therapistCredentials`.
  - `prisma.$transaction(async (tx) => ...)` pattern for multi-write atomicity (assessment +
    `sensoryProfile.createMany`).
  - `ctx.ip` already populated (`packages/api/src/context.ts`) — used for `therapistIp`/
    `guardianIp`, never trusted from client input (same as BE-07's `sectionH`).

- `packages/api/src/schemas/assessment.ts` (BE-07) already exports, reusable as-is:
  - `GoalTemplateSchema = { goalId: z.string(), description: z.string(), targetAttainmentPct: z.number() }`
    → reuse for `sectionE.updatedGoals`.
  - `SensoryRatingSchema = { systemId: z.string(), rating: z.number().int().min(1).max(5), notes: z.string() }`
    → identical shape to the required `SensoryCheckInputSchema`; alias it.

- `packages/api/src/routers/index.ts` already registers `assessment: assessmentRouter` — no
  change needed there, only new procedures added to the existing router object.

- No test framework / seed data exists for `TreatmentPlan`/`Goal` yet (BE-09/10 not built, and
  `seed-clinical.ts` has no Goal/TreatmentPlan rows). Verification is `pnpm check-types` +
  `pnpm check` + manual smoke test with hand-created `TreatmentPlan`/`Goal` rows.

## Files to change

### 1. `packages/db/prisma/schema/clinical.prisma` — `SensoryProfile`

Add optional `followUpId` + relation, mirroring the existing `assessmentId` relation:

```prisma
model SensoryProfile {
  id           String   @id @default(cuid())
  assessmentId String?
  followUpId   String?
  systemId     String
  rating       Int
  notes        String?
  recordedAt   DateTime @default(now())

  assessment InitialAssessment?  @relation(fields: [assessmentId], references: [id])
  followUp   FollowUpAssessment? @relation(fields: [followUpId], references: [id])

  @@map("sensory_profile")
}
```

### 2. `packages/db/prisma/schema/plans.prisma` — `GoalProgressEntry` + `FollowUpAssessment`

Turn `GoalProgressEntry.followUpId` (already a plain `String`) into a real relation, and add the
two inverse relation arrays on `FollowUpAssessment`:

```prisma
model GoalProgressEntry {
  id            String     @id @default(cuid())
  goalId        String
  followUpId    String
  attainmentPct Int
  status        GoalStatus
  evidenceNotes String?
  recordedAt    DateTime   @default(now())

  goal     Goal               @relation(fields: [goalId], references: [id])
  followUp FollowUpAssessment @relation(fields: [followUpId], references: [id])

  @@map("goal_progress_entry")
}

model FollowUpAssessment {
  id                  String   @id @default(cuid())
  childId             String
  initialAssessmentId String
  treatmentPlanId     String
  previousFollowUpId  String?
  therapistId         String
  versionNumber       Int      @default(1)
  sectionA            Json
  sectionB            Json
  sectionC            Json
  sectionD            Json
  sectionE            Json
  sectionF            Json
  createdAt           DateTime @default(now())

  sensoryProfiles SensoryProfile[]
  progressEntries GoalProgressEntry[]

  @@map("follow_up_assessment")
}
```

`childId`, `initialAssessmentId`, `treatmentPlanId`, `previousFollowUpId` stay plain strings
(validated in application code) — consistent with `InitialAssessment`/`FollowUpAssessment`'s
existing pattern of only some links being FK relations.

Run `pnpm db:push` after editing (regenerates Prisma client into
`packages/db/prisma/generated/`).

### 3. `packages/api/src/schemas/assessment.ts` — append new schemas

Add alongside the existing BE-07 schemas (reuse `GoalTemplateSchema`, alias `SensoryRatingSchema`):

```typescript
export const GoalStatusSchema = z.enum(["MET", "IN_PROGRESS", "NOT_MET", "DISCONTINUED"]);

export const GoalProgressInputSchema = z.object({
	goalId: z.string(),
	attainmentPct: z.number().int().min(0).max(100),
	status: GoalStatusSchema,
	evidenceNotes: z.string(),
});

export const SensoryCheckInputSchema = SensoryRatingSchema; // { systemId, rating 1-5, notes }

export const SensoryCheckResultSchema = SensoryCheckInputSchema.extend({
	baseline: z.number().int(),
	change: z.number().int(),
});

export const FollowUpSectionASchema = z.object({
	date: z.string(),
	therapistId: z.string(),
	sessionNumber: z.number().int(),
	weeksSinceInitial: z.number().int(),
	parentPresent: z.boolean(),
});

export const FollowUpSectionBSchema = z.object({
	goalProgress: z.array(GoalProgressInputSchema).min(1),
});

export const FollowUpSectionCSchema = z.object({
	sensoryCheck: z.array(SensoryCheckInputSchema).length(7),
});

export const FollowUpSectionDSchema = z.object({
	improvementsAtHome: z.string(),
	improvementsAtSchool: z.string(),
	regressions: z.string().optional(),
	homeProgramCompliance: z.string(),
	sessionEngagement: z.string(),
	schoolPerformanceChanges: z.string(),
	behaviourChanges: z.string(),
	newSkillsObserved: z.string(),
	equipmentEffectivelyUsed: z.string(),
	therapistObservations: z.string(),
});

export const FollowUpSectionESchema = z.object({
	goalStatusDecisions: z.array(z.string()),
	updatedGoals: z.array(GoalTemplateSchema),
	updatedHomeProgram: z.string(),
	nextFollowUpDate: z.string(),
	nextAssessmentType: z.string(),
	clinicalNotes: z.string(),
});

export const FollowUpSectionFSchema = z.object({
	therapistName: z.string(),
	therapistCredentials: z.string().optional(),
	therapistIp: z.string().optional(),
	guardianName: z.string(),
	guardianIp: z.string().optional(),
});

export const CreateFollowUpInput = z.object({
	childId: z.string(),
	initialAssessmentId: z.string(),
	treatmentPlanId: z.string(),
	previousFollowUpId: z.string().optional(),
	sectionA: FollowUpSectionASchema,
	sectionB: FollowUpSectionBSchema,
	sectionC: FollowUpSectionCSchema,
	sectionD: FollowUpSectionDSchema,
	sectionE: FollowUpSectionESchema,
	sectionF: FollowUpSectionFSchema,
});

export const SensoryDeltaSchema = z.object({
	system: z.string(),
	baseline: z.number().int(),
	current: z.number().int(),
	change: z.number().int(),
});

export const FollowUpAssessmentSchema = z.object({
	id: z.string(),
	childId: z.string(),
	initialAssessmentId: z.string(),
	treatmentPlanId: z.string(),
	previousFollowUpId: z.string().nullable(),
	therapistId: z.string(),
	versionNumber: z.number().int(),
	sectionA: FollowUpSectionASchema,
	sectionB: FollowUpSectionBSchema,
	sectionC: z.object({ sensoryCheck: z.array(SensoryCheckResultSchema) }),
	sectionD: FollowUpSectionDSchema,
	sectionE: FollowUpSectionESchema,
	sectionF: FollowUpSectionFSchema,
	createdAt: z.date(),
});
```

`FollowUpAssessmentSchema` is exported as a type contract (not wired as an `.output()`
validator), matching BE-07's `InitialAssessmentSchema` convention of returning raw Prisma rows.

### 4. `packages/api/src/routers/assessment.ts` — add 4 procedures

Add to the imports from `../schemas/assessment`, then append to `assessmentRouter`:

```typescript
createFollowUp: protectedProcedure
	.input(CreateFollowUpInput)
	.mutation(async ({ input, ctx }) => {
		await getChildForRead(input.childId, ctx);

		const initialAssessment = await prisma.initialAssessment.findFirst({
			where: { id: input.initialAssessmentId, childId: input.childId },
		});
		if (!initialAssessment) throw new TRPCError({ code: "NOT_FOUND" });

		const treatmentPlan = await prisma.treatmentPlan.findFirst({
			where: { id: input.treatmentPlanId, childId: input.childId },
		});
		if (!treatmentPlan) throw new TRPCError({ code: "NOT_FOUND" });
		if (!treatmentPlan.isActive) {
			throw new TRPCError({ code: "BAD_REQUEST", message: "treatmentPlanId is not the active plan" });
		}

		if (input.previousFollowUpId) {
			const previous = await prisma.followUpAssessment.findFirst({
				where: { id: input.previousFollowUpId, childId: input.childId },
			});
			if (!previous) throw new TRPCError({ code: "NOT_FOUND" });
		}

		const baselineRows = await prisma.sensoryProfile.findMany({
			where: { assessmentId: input.initialAssessmentId },
		});
		const baselineMap = new Map(baselineRows.map((r) => [r.systemId, r.rating]));

		const sensoryResults = input.sectionC.sensoryCheck.map((check) => {
			const baseline = baselineMap.get(check.systemId);
			if (baseline === undefined) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `No baseline sensory profile for systemId ${check.systemId}`,
				});
			}
			return { ...check, baseline, change: check.rating - baseline };
		});

		const sectionF = {
			...input.sectionF,
			therapistIp: ctx.ip,
			guardianIp: ctx.ip,
			therapistCredentials: await buildCredentialsSnapshot(ctx.auth.userId),
		};

		return prisma.$transaction(async (tx) => {
			const followUp = await tx.followUpAssessment.create({
				data: {
					childId: input.childId,
					initialAssessmentId: input.initialAssessmentId,
					treatmentPlanId: input.treatmentPlanId,
					previousFollowUpId: input.previousFollowUpId,
					therapistId: ctx.auth.userId,
					sectionA: input.sectionA,
					sectionB: input.sectionB,
					sectionC: { sensoryCheck: sensoryResults },
					sectionD: input.sectionD,
					sectionE: input.sectionE,
					sectionF,
				},
			});

			await tx.sensoryProfile.createMany({
				data: sensoryResults.map((r) => ({
					followUpId: followUp.id,
					systemId: r.systemId,
					rating: r.rating,
					notes: r.notes,
				})),
			});

			for (const progress of input.sectionB.goalProgress) {
				const goal = await tx.goal.findFirst({
					where: { id: progress.goalId, treatmentPlanId: input.treatmentPlanId },
				});
				if (!goal) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: `Goal ${progress.goalId} not found on treatment plan`,
					});
				}

				await tx.goalProgressEntry.create({
					data: {
						goalId: progress.goalId,
						followUpId: followUp.id,
						attainmentPct: progress.attainmentPct,
						status: progress.status,
						evidenceNotes: progress.evidenceNotes,
					},
				});

				await tx.goal.update({
					where: { id: progress.goalId },
					data: {
						currentAttainmentPct: progress.attainmentPct,
						status: progress.status,
					},
				});
			}

			return followUp;
		});
	}),

getFollowUp: protectedProcedure
	.input(z.object({ followUpId: z.string() }))
	.query(async ({ input, ctx }) => {
		const followUp = await prisma.followUpAssessment.findUnique({
			where: { id: input.followUpId },
		});
		if (!followUp) throw new TRPCError({ code: "NOT_FOUND" });

		await getChildForRead(followUp.childId, ctx);

		return followUp;
	}),

listFollowUps: protectedProcedure
	.input(z.object({ childId: z.string() }))
	.query(async ({ input, ctx }) => {
		await getChildForRead(input.childId, ctx);

		return prisma.followUpAssessment.findMany({
			where: { childId: input.childId },
			orderBy: { createdAt: "asc" },
		});
	}),

getFollowUpDelta: protectedProcedure
	.input(z.object({ followUpId: z.string() }))
	.query(async ({ input, ctx }) => {
		const followUp = await prisma.followUpAssessment.findUnique({
			where: { id: input.followUpId },
		});
		if (!followUp) throw new TRPCError({ code: "NOT_FOUND" });

		await getChildForRead(followUp.childId, ctx);

		const sectionC = followUp.sectionC as unknown as {
			sensoryCheck: { systemId: string; rating: number; baseline: number; change: number }[];
		};

		return sectionC.sensoryCheck.map((entry) => ({
			system: entry.systemId,
			baseline: entry.baseline,
			current: entry.rating,
			change: entry.change,
		}));
	}),
```

How each acceptance criterion is met:
- **Linked to initial assessment + active plan** — explicit `findFirst` checks on
  `initialAssessmentId`/`treatmentPlanId` scoped to `childId`, plus `treatmentPlan.isActive`
  check.
- **`GoalProgressEntry` per goal in sectionB** — loop inside the transaction, one
  `goalProgressEntry.create` per `sectionB.goalProgress` item.
- **`Goal.currentAttainmentPct`/`status` updated** — `tx.goal.update` in the same loop.
- **7 `SensoryProfile` rows with `followUpId` (not `assessmentId`)** —
  `FollowUpSectionCSchema.sensoryCheck.length(7)` + `sensoryProfile.createMany` with
  `followUpId: followUp.id`, `assessmentId` omitted (defaults to `null`).
- **Sensory delta computed & stored in sectionC JSONB** — `sensoryResults` (baseline + change per
  system) is what's persisted as `FollowUpAssessment.sectionC`.
- **`getFollowUpDelta` per-system delta vs baseline** — reads the already-computed
  `baseline`/`change`/`rating` straight out of stored `sectionC`.
- **`previousFollowUpId` linkage** — stored as given (after existence validation).
- **`FORBIDDEN` for unassigned therapist** — `getChildForRead` on all four procedures.

## Out of scope

- Any `Goal` table writes from `sectionE` (`goalStatusDecisions`, `updatedGoals`) — deferred to
  BE-09's `applyPlanModificationDecisions`. Stored as JSON only.
- "Vs previous follow-up" sensory comparisons — only baseline (initial assessment) delta is
  computed/stored, per `getFollowUpDelta`'s documented shape.
- Seeding `TreatmentPlan`/`Goal` rows for dev/test data — not part of this issue; manual creation
  needed for smoke testing until BE-09/BE-10 land.
- Pagination on `listFollowUps` — matches BE-07's unpaginated `assessment.list`.

## Verification

1. `pnpm db:push` — applies the schema changes (`SensoryProfile.followUpId`,
   `GoalProgressEntry`/`FollowUpAssessment` relations), regenerates the Prisma client.
2. `pnpm check-types` — must pass across all packages (explicit AC).
3. `pnpm check` (Biome) — tabs/double-quotes/import order on the two edited files.
4. Manual smoke test via `pnpm dev:server` + tRPC (or `pnpm db:studio`):
   - Use a seeded child with an existing `InitialAssessment` (7 `SensoryProfile` rows via
     `assessmentId`).
   - Manually create one `TreatmentPlan` (`childId`, `isActive: true`) and 1–2 `Goal` rows on it.
   - `assessment.createFollowUp` with `sectionC.sensoryCheck` covering all 7 `systemId`s from the
     seeded baseline, and `sectionB.goalProgress` referencing the created `Goal` ids.
   - Confirm: `FollowUpAssessment` row created; `sectionC` JSON contains `baseline`/`change` per
     system; 7 new `SensoryProfile` rows with `followUpId` set (`assessmentId = null`);
     `GoalProgressEntry` rows created; `Goal.currentAttainmentPct`/`status` updated.
   - `assessment.getFollowUpDelta({ followUpId })` → `{ system, baseline, current, change }` per
     system, matching stored `sectionC`.
   - `assessment.listFollowUps({ childId })` and `assessment.getFollowUp({ followUpId })` return
     expected rows.
   - A second `createFollowUp` with `previousFollowUpId` set to the first follow-up's id succeeds
     and stores the link.
   - As a `THERAPIST` not assigned to the child, all four procedures throw `FORBIDDEN`.
   - `treatmentPlanId` pointing at a plan with `isActive: false` → `BAD_REQUEST`.
   - `initialAssessmentId`/`previousFollowUpId` belonging to a different child → `NOT_FOUND`.
