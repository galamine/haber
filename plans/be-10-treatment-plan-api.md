# Plan: BE-10 — Treatment Plan Builder & Presets API

## Context

Implements the full treatment plan lifecycle in tRPC: creation (with optional preset cloning), per-game configuration, versioned modifications, and lifecycle transitions (activate, pause, resume, extend, close). This is the central backend feature connecting children, therapists, games, and goals into a structured clinical workflow.

All Prisma models already exist from BE-01c: `TreatmentPlan`, `PlanGameAssignment`, `Goal`, `GoalProgressEntry`. No schema changes required.

---

## Files to Create

| File | Purpose |
|---|---|
| `packages/api/src/schemas/plan.ts` | All Zod input/output schemas |
| `packages/api/src/routers/plan.ts` | All tRPC procedures |

## Files to Modify

| File | Change |
|---|---|
| `packages/api/src/index.ts` | Add preset JSON import + `export const PLAN_PRESETS` |
| `packages/api/src/routers/index.ts` | Register `plan: planRouter` in `appRouter` |

---

## Step 1 — Preset Loading (`packages/api/src/index.ts`)

Add alongside existing imports:

```typescript
import presetsRaw from "../../../clinical-data/treatment-plan-presets.json";
export const PLAN_PRESETS = presetsRaw.presets;
```

- Requires `"resolveJsonModule": true` in tsconfig (standard for Better-T-Stack).
- Path `../../../` from `packages/api/src/` reaches repo root.
- This is the only addition to `index.ts`.

---

## Step 2 — Schemas (`packages/api/src/schemas/plan.ts`)

```typescript
import { z } from "zod";

export const CreatePlanInput = z.object({
  childId: z.string(),
  name: z.string(),
  programLengthWeeks: z.number().int().positive(),
  phases: z.array(z.record(z.unknown())).optional(),
  startDate: z.coerce.date().optional(),
  targetMilestones: z.array(z.string()).optional(),
  sessionDurationMinutes: z.number().int().positive().optional(),
  presetId: z.string().optional(),
});

export const AddGameInput = z.object({
  planId: z.string(),
  gameVersionId: z.string(),
  durationSeconds: z.number().int().positive().optional(),
  repetitions: z.number().int().positive().optional(),
  frequencyPerWeek: z.number().int().positive().optional(),
  instructions: z.string().optional(),
  appliesToPhase: z.string().optional(),
});

export const UpdateGameInput = z.object({
  assignmentId: z.string(),
  durationSeconds: z.number().int().positive().optional(),
  repetitions: z.number().int().positive().optional(),
  frequencyPerWeek: z.number().int().positive().optional(),
  instructions: z.string().optional(),
  appliesToPhase: z.string().optional(),
});

export const ReorderGamesInput = z.object({
  planId: z.string(),
  orderedIds: z.array(z.string()), // PlanGameAssignment ids in new order
});

export const ModificationDecisionInput = z.object({
  goalId: z.string(),
  action: z.enum(["CARRY_OVER", "CLOSE", "MODIFY"]),
  newDescription: z.string().optional(),                          // MODIFY only
  newHorizon: z.enum(["SHORT_TERM", "LONG_TERM"]).optional(),    // MODIFY only
  newTargetAttainmentPct: z.number().int().min(0).max(100).optional(), // MODIFY only
});

export const ModifyPlanInput = z.object({
  planId: z.string(),
  changes: z.object({
    name: z.string().optional(),
    programLengthWeeks: z.number().int().positive().optional(),
    phases: z.array(z.record(z.unknown())).optional(),
    startDate: z.coerce.date().optional(),
    targetMilestones: z.array(z.string()).optional(),
    sessionDurationMinutes: z.number().int().positive().optional(),
  }),
  goalDecisions: z.array(ModificationDecisionInput),
});

export const PlanPresetSchema = z.object({
  preset_id: z.string(),
  case_label: z.string(),
  linked_diagnoses: z.array(z.string()),
  session_duration_minutes: z.number(),
  session_structure: z.array(z.object({
    phase: z.string(),
    minutes: z.number(),
    label: z.string(),
  })),
  short_term_goals_template: z.array(z.string()),
  long_term_goals_template: z.array(z.string()),
  home_program: z.string(),
});
```

---

## Step 3 — Router (`packages/api/src/routers/plan.ts`)

### Authorization helpers (module-level, not exported)

Reuse `getChildForRead` imported from `./child`.

Add a local `getPlanForTherapist(planId, ctx)`:

```typescript
async function getPlanForTherapist(planId: string, ctx: { auth: AuthUser }) {
  const plan = await prisma.treatmentPlan.findFirst({
    where: {
      id: planId,
      ...(ctx.auth.role !== "SUPER_ADMIN" ? { clinicId: ctx.auth.tenantId ?? undefined } : {}),
    },
  });
  if (!plan) throw new TRPCError({ code: "NOT_FOUND" });

  if (ctx.auth.role === "THERAPIST" || ctx.auth.role === "STAFF") {
    const child = await prisma.child.findFirst({ where: { id: plan.childId, deletedAt: null } });
    if (!child) throw new TRPCError({ code: "NOT_FOUND" });
    const isAssigned =
      child.preferredTherapistId === ctx.auth.userId ||
      (await prisma.childTherapistAssignment.findFirst({
        where: { childId: plan.childId, therapistId: ctx.auth.userId },
      })) !== null;
    if (!isAssigned) throw new TRPCError({ code: "FORBIDDEN" });
  }
  return plan;
}
```

### Internal helper: `applyPlanModificationDecisions`

Plain async function (not a tRPC procedure) called inside `plan.modify`'s transaction:

```typescript
async function applyPlanModificationDecisions(
  tx: Prisma.TransactionClient,
  newPlanId: string,
  decisions: z.infer<typeof ModificationDecisionInput>[],
) {
  for (const d of decisions) {
    if (d.action === "CLOSE") {
      await tx.goal.update({ where: { id: d.goalId }, data: { status: "DISCONTINUED" } });

    } else if (d.action === "CARRY_OVER") {
      const old = await tx.goal.findUniqueOrThrow({ where: { id: d.goalId } });
      const next = await tx.goal.create({
        data: {
          treatmentPlanId: newPlanId,
          description: old.description,
          horizon: old.horizon,
          targetAttainmentPct: old.targetAttainmentPct,
          currentAttainmentPct: old.currentAttainmentPct,
          status: old.status,
        },
      });
      await tx.goal.update({ where: { id: d.goalId }, data: { supersededByGoalId: next.id } });

    } else if (d.action === "MODIFY") {
      const old = await tx.goal.findUniqueOrThrow({ where: { id: d.goalId } });
      const next = await tx.goal.create({
        data: {
          treatmentPlanId: newPlanId,
          description: d.newDescription ?? old.description,
          horizon: d.newHorizon ?? old.horizon,
          targetAttainmentPct: d.newTargetAttainmentPct ?? old.targetAttainmentPct,
          currentAttainmentPct: 0,
          status: "IN_PROGRESS",
        },
      });
      await tx.goal.update({ where: { id: d.goalId }, data: { supersededByGoalId: next.id } });
    }
  }
}
```

### Procedures (all use `protectedProcedure`)

#### `plan.create`
1. If `input.presetId`: find preset in `PLAN_PRESETS` by `preset_id`; throw `BAD_REQUEST` if not found.
2. Call `getChildForRead(input.childId, ctx)` for therapist auth.
3. Build plan data:
   - If preset: `phases = preset.session_structure`, `sessionDurationMinutes = input.sessionDurationMinutes ?? preset.session_duration_minutes`
   - `status = "DRAFT"`, `isActive = false`, `versionNumber = 1`, `parentPlanId = null`
   - `sourcePresetId = input.presetId ?? null`
   - `clinicId = ctx.auth.tenantId!`, `createdById = ctx.auth.userId`
4. In a transaction:
   - `tx.treatmentPlan.create(planData)`
   - If preset: `tx.goal.createMany` for each `short_term_goals_template` (`horizon: "SHORT_TERM"`) and `long_term_goals_template` (`horizon: "LONG_TERM"`)
5. Return created plan.

#### `plan.get`
- `input: { planId: z.string() }`
- `getPlanForTherapist`
- Return plan with `include: { gameAssignments: { include: { gameVersion: true } }, goals: true }`

#### `plan.list`
- `input: { childId: z.string() }`
- `getChildForRead(childId, ctx)` for auth
- `findMany({ where: { childId }, orderBy: { versionNumber: "asc" } })`

#### `plan.listActive`
- `input: { childId: z.string() }`
- Same auth as `plan.list`
- Adds `isActive: true` to where clause

#### `plan.addGame`
- Input: `AddGameInput`
- `getPlanForTherapist`
- Verify `gameVersionId` exists (`prisma.gameVersion.findUnique`); throw `BAD_REQUEST` if not
- Get current max `order` among existing assignments for this plan, add 1
- `prisma.planGameAssignment.create`

#### `plan.removeGame`
- `input: { assignmentId: z.string() }`
- Fetch assignment; throw `NOT_FOUND` if missing
- `getPlanForTherapist(assignment.planId, ctx)` for auth
- `prisma.planGameAssignment.delete`

#### `plan.updateGame`
- Input: `UpdateGameInput`
- Fetch assignment, call `getPlanForTherapist(assignment.planId, ctx)`
- `prisma.planGameAssignment.update` with only the provided optional fields

#### `plan.reorderGames`
- Input: `ReorderGamesInput`
- `getPlanForTherapist`
- `prisma.$transaction`: for each id in `orderedIds`, `update({ where: { id }, data: { order: index } })`

#### `plan.checkSessionDuration`
- `input: { planId: z.string() }`
- `getPlanForTherapist`
- Fetch plan with `gameAssignments`
- `totalSeconds = assignments.reduce((sum, a) => sum + (a.durationSeconds ?? 0), 0)`
- `limitSeconds = plan.sessionDurationMinutes * 60`
- Return `{ totalSeconds, limitSeconds, exceeds: totalSeconds > limitSeconds }` — does NOT throw

#### `plan.activate`
- `getPlanForTherapist`
- Throw `BAD_REQUEST` if `plan.status` is not `"DRAFT"` or `"PAUSED"`
- `update({ data: { status: "ACTIVE", isActive: true } })`
- `// TODO BE-11: generateSessionsForPlan(plan.id)`
- Return updated plan

#### `plan.pause`
- `getPlanForTherapist`; assert `status === "ACTIVE"`
- `update({ data: { status: "PAUSED" } })` — `isActive` stays `true` (plan is still the designated plan for the child; only operational state changes)

#### `plan.resume`
- `getPlanForTherapist`; assert `status === "PAUSED"`
- `update({ data: { status: "ACTIVE" } })`

#### `plan.extend`
- `input: { planId: z.string(), programLengthWeeks: z.number().int().positive() }`
- `getPlanForTherapist`
- `update({ data: { programLengthWeeks: input.programLengthWeeks } })`

#### `plan.close`
- `input: { planId: z.string(), closureReason: z.string(), outcomeSummary: z.string() }`
- `getPlanForTherapist`; assert `status !== "CLOSED"`
- `update({ data: { status: "CLOSED", isActive: false, closureReason, outcomeSummary } })`

#### `plan.modify`
1. `getPlanForTherapist`; assert plan is not `"CLOSED"`.
2. `prisma.$transaction(async (tx) => { ... })`:
   - `tx.treatmentPlan.update(currentId, { data: { isActive: false } })`
   - `const assignments = tx.planGameAssignment.findMany({ where: { planId: currentId } })`
   - `const newPlan = tx.treatmentPlan.create({ data: { ...currentPlanFields, ...input.changes, versionNumber: current.versionNumber + 1, parentPlanId: current.id, isActive: true, status: "ACTIVE", sourcePresetId: current.sourcePresetId } })`
   - `tx.planGameAssignment.createMany` copying all game assignments (strip `id`, set `planId = newPlan.id`)
   - `applyPlanModificationDecisions(tx, newPlan.id, input.goalDecisions)`
3. `// TODO BE-11: regenerateFutureSessions(current.id, newPlan.id, new Date())`
4. Return `newPlan`.

#### `plan.listPresets`
- No input
- `return PLAN_PRESETS` — zero DB queries

---

## Step 4 — Register Router (`packages/api/src/routers/index.ts`)

```typescript
import { planRouter } from "./plan";

export const appRouter = router({
  // ...existing routers...
  plan: planRouter,
});
```

---

## Preset Cloning Field Mapping

| Preset JSON field | Maps to |
|---|---|
| `preset_id` | `sourcePresetId` on TreatmentPlan |
| `session_structure` | `phases` (Json field — stored as-is) |
| `session_duration_minutes` | `sessionDurationMinutes` (overridden by `input.sessionDurationMinutes` if provided) |
| `short_term_goals_template[]` | `Goal` records with `horizon: "SHORT_TERM"` |
| `long_term_goals_template[]` | `Goal` records with `horizon: "LONG_TERM"` |
| `case_label` | Not stored — user's `input.name` (required) is always the plan name |
| `home_program` | No corresponding DB field — silently dropped |

---

## Verification

1. `pnpm check-types` passes with zero errors.
2. `plan.listPresets` returns exactly 5 presets with correct `preset_id` values: `preset_asd_sensory`, `preset_cp_spastic_diplegia_gmfcs2`, `preset_adhd_sensory_seeking`, `preset_down_syndrome_gdd`, `preset_dcd_dyspraxia`.
3. `plan.create` with `presetId: "preset_asd_sensory"` → returned plan has `sourcePresetId` set; DB has Goal records for the plan split by `SHORT_TERM`/`LONG_TERM`.
4. `plan.modify` on an active plan → old plan has `isActive: false`; new plan has `versionNumber = old + 1`, `parentPlanId = old.id`, `isActive: true`.
5. `plan.checkSessionDuration` returns `exceeds: true` when total game seconds exceed `sessionDurationMinutes * 60`; subsequent saves are not blocked.
6. `plan.close` → `status = "CLOSED"`, `isActive = false`, `closureReason` and `outcomeSummary` persisted.
7. `plan.list` for a child after `plan.modify` returns 2 rows; `plan.listActive` returns only the newer version.
