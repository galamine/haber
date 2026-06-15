# BE-07: Initial Assessment Form 1 API

## Context

The *Haber Specialisto* initial assessment (Form 1) captures 8 sections (A–H) covering
referral/demographics, medical/developmental history, milestones, sensory profile, functional
concerns, standardized tools, goals/intervention plan, and signatures/consent. Records are
versioned and append-only: `create` makes version 1, `review` appends version 2, 3, ... — prior
versions are never overwritten. Therapist credentials are snapshotted into `sectionH` at signing
time (not a live link to `User`).

`InitialAssessment` and `SensoryProfile` already exist in
`packages/db/prisma/schema/clinical.prisma` exactly as needed — **no schema changes or
migrations**. BE-06 (consent gate, `Child.consentStatus` + `GRANTED`) and BE-02 (taxonomy seed:
`Milestone`, `SensorySystem`, `Diagnosis`, `FunctionalConcern`, `AssessmentTool`, `Equipment`,
`InterventionApproach`, all seeded from `clinical-data/clinical-taxonomies.seed.json`) are both
done. This is purely an API-layer task: one new schema file, one new router file, and a one-line
registration.

## Existing facts (verified)

- `packages/db/prisma/schema/clinical.prisma`:
  ```prisma
  model InitialAssessment {
    id            String   @id @default(cuid())
    childId       String
    therapistId   String
    versionNumber Int      @default(1)
    sectionA      Json
    sectionB      Json
    sectionC      Json
    sectionD      Json
    sectionE      Json
    sectionF      Json
    sectionG      Json
    sectionH      Json
    createdAt     DateTime @default(now())
    child            Child            @relation(fields: [childId], references: [id])
    sensoryProfiles  SensoryProfile[]
  }

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
  `Child.consentStatus: ConsentStatus @default(PENDING)` (`PENDING | GRANTED | WITHDRAWN`).
  `User.credentialsQualifications: String?`, `User.credentialsRegistrationNumber: String?` (no
  `name` field on `User`).

- `packages/api/src/routers/child.ts` exports `getChildForRead(childId, ctx)`:
  - scopes lookup by `clinicId: ctx.auth.tenantId` (unless `SUPER_ADMIN`); throws `NOT_FOUND` if
    missing/wrong tenant.
  - for `THERAPIST`/`STAFF`, throws `FORBIDDEN` unless `child.preferredTherapistId === userId` or a
    `ChildTherapistAssignment` row exists for `(childId, userId)`.
  - returns the child record (including `consentStatus`).
  - This single call satisfies tenant-scoping + "assigned therapist with implicit permission" +
    the `FORBIDDEN` acceptance criterion for **all four** procedures — no separate
    `hasPermission`/`PERMISSIONS.*` entry needed.

- `ctx.ip` is already populated in `packages/api/src/context.ts` (used by `consent.ts` as
  `ip: ctx.ip`, never trusted from client input). Same pattern applies here for
  `sectionH.therapistIp` / `sectionH.guardianIp`.

- Schema/router conventions: `protectedProcedure` + `router` from `packages/api/src/index.ts`;
  Zod schemas live in `packages/api/src/schemas/<name>.ts` (`<Op>Input` / `<Entity>Schema`
  naming, e.g. `schemas/consent.ts`, `schemas/child.ts`); `prisma.$transaction(async (tx) => ...)`
  for multi-write atomicity (e.g. `child.ts` create).

- Taxonomy-referencing IDs (`milestoneId`, `systemId`, `toolId`, items of `primaryDiagnoses` /
  `functionalConcerns` / `equipment`) are plain `z.string()` throughout the codebase — no Zod
  enum or DB cross-validation against taxonomy tables exists anywhere, so this stays consistent.

- No test framework exists — verification is `pnpm check-types` + `pnpm check` + manual.

## Files to change

### 1. `packages/api/src/schemas/assessment.ts` — NEW

Sub-entity schemas:
- `MilestoneEntrySchema = { milestoneId: z.string(), achievedAtAgeMonths: z.number().int().optional(), delayed: z.boolean(), notes: z.string() }`
- `SensoryRatingSchema = { systemId: z.string(), rating: z.number().int().min(1).max(5), notes: z.string() }`
- `ToolEntrySchema = { toolId: z.string(), scoresSummary: z.string() }`
- `GoalTemplateSchema = { goalId: z.string(), description: z.string(), targetAttainmentPct: z.number() }`

Section schemas (camelCase per issue spec):
- `SectionASchema`: `patientName, dob (z.string()), age: { years: z.number().int(), months: z.number().int() }, gender, assessmentDate (z.string()), location, referringTherapist, referralSource, caregiverName, caregiverRelation, caregiverContact, caregiverEmail (z.string().email()), chiefComplaint` — all remaining fields `z.string()`.
- `SectionBSchema`: `primaryDiagnoses: z.array(z.string()), prenatalHistory, birthHistory, neonatalHistory (z.string()), gestationalAgeWeeks: z.number().int().optional(), medicalHistory, currentMedications, allergies, previousTherapies (z.string())`.
- `SectionCSchema`: `{ milestones: z.array(MilestoneEntrySchema).min(1) }` — the `.min(1)` + required `milestoneId` satisfies "at least one item with milestoneId".
- `SectionDSchema`: `{ sensoryProfile: z.array(SensoryRatingSchema).length(7), behaviouralObservations: z.string() }` — `.length(7)` ties directly to the "7 SensoryProfile rows" AC.
- `SectionESchema`: `{ functionalConcerns: z.array(z.string()), observations: z.string() }`.
- `SectionFSchema`: `{ toolsAdministered: z.array(ToolEntrySchema), overallSummary: z.string() }`.
- `SectionGSchema`: `{ shortTermGoals: z.array(GoalTemplateSchema), longTermGoals: z.array(GoalTemplateSchema), recommendedFrequency: z.number(), sessionDurationMinutes: z.number(), interventionSetting: z.string(), reviewPeriodWeeks: z.number(), homeProgramRecommendations: z.string(), equipment: z.array(z.string()), referrals: z.string() }`.
- `SectionHSchema`: `{ therapistName: z.string(), therapistCredentials: z.string().optional(), therapistIp: z.string().optional(), guardianName: z.string(), guardianIp: z.string().optional(), consentObtained: z.literal(true) }` — the three `.optional()` fields are always overwritten server-side before persisting (see router below), so they're optional on input.

Top-level:
- `CreateAssessmentInput = { childId: z.string(), sectionA..sectionH (as above) }`.
- `InitialAssessmentSchema = { id, childId, therapistId, versionNumber: z.number().int(), sectionA..sectionH, createdAt: z.date() }` — mirrors the Prisma model; exported as a type contract (not used as an `.output()` validator, matching existing router convention of returning raw Prisma rows).

Note: `dob`/`assessmentDate` are `z.string()` (ISO date strings, matching
`clinical-data/initial-assessment.example.json`), not `z.coerce.date()` — these sections land in
Prisma `Json` columns, and `Date` objects aren't valid JSON, so plain strings avoid any
serialization workaround.

### 2. `packages/api/src/routers/assessment.ts` — NEW

```typescript
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
```

How each acceptance criterion is met:
- **`PRECONDITION_FAILED`** — checked directly off `child.consentStatus` returned by
  `getChildForRead` (no extra query).
- **`CONFLICT`** — `create` checks whether *any* `InitialAssessment` row already exists for the
  child; if so it's already initiated and `review` must be used for subsequent versions.
- **Milestone tagging** — enforced via `SectionCSchema` Zod (`.min(1)` + required `milestoneId`).
- **Credential snapshot** — `buildCredentialsSnapshot` reads `User.credentialsQualifications` +
  `credentialsRegistrationNumber` live at call time and writes the joined string into
  `sectionH.therapistCredentials`, overwriting any client-supplied value.
- **7 `SensoryProfile` rows** — `SectionDSchema.sensoryProfile.length(7)` + `createMany` inside
  the same `$transaction` as the assessment insert, linked via `assessmentId`.
- **Versioning / append-only** — `create` always writes `versionNumber: 1` (guaranteed unique by
  the CONFLICT check); `review` reads the current max `versionNumber` and inserts `+1` as a new
  row — prior rows are never updated/deleted. `review` on a child with no prior assessment throws
  `NOT_FOUND` (use `create` first).
- **`ip` fields** — `therapistIp`/`guardianIp` always set from `ctx.ip` server-side, matching
  `consent.ts`'s `ip: ctx.ip` pattern (never trusted from client input).
- **Tenant scoping / `FORBIDDEN`** — via `getChildForRead` in all four procedures.
- **Consent re-check on `review`** — intentionally *not* repeated (only `create` has this AC in
  the issue); keeps the change scoped to what's specified.

### 3. `packages/api/src/routers/index.ts` — register

Add `import { assessmentRouter } from "./assessment";` (alphabetically before `auth`) and add
`assessment: assessmentRouter,` to the `appRouter` object.

## Out of scope

- Any DB schema/migration changes — `InitialAssessment`/`SensoryProfile` already exist as needed.
- A separate "get specific historical version by id" procedure — `get` returns the latest version
  for a child, `list` returns all versions ascending; fetching an arbitrary past version by its
  own `id` is not in the issue and not added here.
- DB-backed validation of taxonomy IDs (`milestoneId`, `systemId`, `toolId`, etc.) — kept as plain
  strings, consistent with the rest of the codebase.

## Verification

1. `pnpm check-types` from repo root — must pass (explicit AC). Section schemas use only
   strings/numbers/booleans/arrays/objects, so `tx.initialAssessment.create({ data: { sectionA:
   input.sectionA, ... } })` should satisfy Prisma's `InputJsonValue` without casts.
2. `pnpm check` (Biome) on the two new files + edited `index.ts` — tabs/double-quotes/import order.
3. Manual smoke test via `pnpm dev:server` + tRPC (or `pnpm db:studio` to inspect rows), using a
   child with `consentStatus = GRANTED` and a payload shaped per
   `clinical-data/initial-assessment.example.json` (converted to camelCase):
   - `assessment.create` → `InitialAssessment` row with `versionNumber = 1`, plus 7
     `SensoryProfile` rows with matching `assessmentId`; `sectionH.therapistCredentials` /
     `therapistIp` / `guardianIp` reflect server-derived values, not client input.
   - second `assessment.create` for the same child → `CONFLICT`.
   - `assessment.review` → new row `versionNumber = 2`; original row untouched; another 7
     `SensoryProfile` rows for the new `assessmentId`.
   - `assessment.list` → both versions ascending; `assessment.get` → version 2.
   - a child with `consentStatus !== "GRANTED"` → `assessment.create` throws
     `PRECONDITION_FAILED`.
   - a THERAPIST not assigned to the child → `assessment.get` throws `FORBIDDEN`.
