# BE-09: Goal Tracking API

## Context

The Haber Specialisto clinical toolkit requires therapists to track goal attainment over time across treatment plan versions. When a plan is modified (BE-10), goals can be carried over unchanged, modified with new parameters, discontinued, or added fresh. Between follow-up sessions, each goal's attainment percentage and status must be recorded as an immutable history entry. This issue implements the tRPC layer for that domain.

The Prisma schema (`Goal`, `GoalProgressEntry`, enums `GoalHorizon`, `GoalStatus`) already exists in `packages/db/prisma/schema/plans.prisma` from BE-01c. This issue creates `goalRouter` in `packages/api/src/routers/goal.ts` and registers it.

**Blocked by:** BE-01c (schema already done, so this can proceed).

## Files to Create

```
packages/api/src/schemas/goal.ts
packages/api/src/routers/goal.ts
```

## Files to Modify

```
packages/api/src/routers/index.ts  — register goalRouter
```

---

## Implementation Details

### 1. `packages/api/src/schemas/goal.ts`

New file. Defines input schemas for all goal procedures plus output type contracts. `GoalSchema` and `GoalProgressEntrySchema` are exported as type contracts — not wired as `.output()` validators, matching BE-07's `InitialAssessmentSchema` convention.

```typescript
import { z } from "zod";

export const CreateGoalInput = z.object({
  treatmentPlanId: z.string(),
  description: z.string(),
  horizon: z.enum(["SHORT_TERM", "LONG_TERM"]),
  targetAttainmentPct: z.number().int().min(0).max(100).default(100),
});

export const UpdateGoalAttainmentInput = z.object({
  goalId: z.string(),
  attainmentPct: z.number().int().min(0).max(100),
  status: z.enum(["MET", "IN_PROGRESS", "NOT_MET", "DISCONTINUED"]),
  evidenceNotes: z.string().optional(),
  followUpId: z.string(),
});

export const PlanModificationDecisionInput = z.object({
  goalId: z.string(),
  action: z.enum(["continue", "modify", "discontinue", "add"]),
  newDescription: z.string().optional(),
  newHorizon: z.enum(["SHORT_TERM", "LONG_TERM"]).optional(),
  newTargetPct: z.number().int().min(0).max(100).optional(),
});

export const ApplyPlanModificationDecisionsInput = z.object({
  decisions: z.array(PlanModificationDecisionInput),
  newGoals: z
    .array(
      z.object({
        description: z.string(),
        targetAttainmentPct: z.number().int().min(0).max(100),
        horizon: z.enum(["SHORT_TERM", "LONG_TERM"]).optional().default("SHORT_TERM"),
      }),
    )
    .optional()
    .default([]),
  newPlanId: z.string(),
});

export const GoalSchema = z.object({
  id: z.string(),
  treatmentPlanId: z.string(),
  description: z.string(),
  horizon: z.enum(["SHORT_TERM", "LONG_TERM"]),
  targetAttainmentPct: z.number().int(),
  currentAttainmentPct: z.number().int(),
  status: z.enum(["MET", "IN_PROGRESS", "NOT_MET", "DISCONTINUED"]),
  supersededByGoalId: z.string().nullable(),
  createdAt: z.date(),
});

export const GoalProgressEntrySchema = z.object({
  id: z.string(),
  goalId: z.string(),
  followUpId: z.string(),
  attainmentPct: z.number().int(),
  status: z.enum(["MET", "IN_PROGRESS", "NOT_MET", "DISCONTINUED"]),
  evidenceNotes: z.string().nullable(),
  recordedAt: z.date(),
});
```

### 2. `packages/api/src/routers/goal.ts`

New file. All five procedures use `protectedProcedure` and call `getPlanForTherapist` (from `plan.ts`) for tenant-scoping and therapist assignment. `getGoalForTherapist` is a module-local helper that fetches the goal with its plan, throws `NOT_FOUND`, then delegates to `getPlanForTherapist` for authorization.

**`goal.list({ treatmentPlanId })`** — returns all goals for the plan (including DISCONTINUED), ordered by `createdAt asc`.

**`goal.create`** — creates with `status = IN_PROGRESS`, `currentAttainmentPct = 0`.

**`goal.updateAttainment`** — wraps `goal.update` + `goalProgressEntry.create` in a `prisma.$transaction`. The `GoalProgressEntry` row is the immutable history; `Goal` holds current state.

**`goal.applyPlanModificationDecisions({ decisions, newGoals, newPlanId })`** — first creates any new goals from `newGoals` templates, then iterates each decision:
- `continue`: copies goal to `newPlanId` preserving all fields.
- `modify`: creates new goal on `newPlanId` with updated fields (or originals), sets old goal to `DISCONTINUED` and populates `supersededByGoalId = newGoal.id`.
- `discontinue`: sets old goal `status = DISCONTINUED`, no new goal created.
- `add`: no-op — all new goals are created from the `newGoals` array before decisions are processed.

Returns `{ continued, modified, added, discontinued }` counts.

**`goal.listProgressHistory({ goalId })`** — returns `GoalProgressEntry[]` ordered by `recordedAt asc`.

### 3. `packages/api/src/routers/index.ts`

```typescript
import { goalRouter } from "./goal";
// add to appRouter:  goal: goalRouter,
```

---

## How Each Acceptance Criterion Is Met

| Criterion | How |
|---|---|
| `goal.create` → `status=IN_PROGRESS`, `currentAttainmentPct=0` | Explicit in `prisma.goal.create` data |
| `goal.updateAttainment` updates + appends `GoalProgressEntry` | `$transaction` wraps both writes; rollback on failure |
| `goal.listProgressHistory` ordered by `recordedAt` | `orderBy: { recordedAt: "asc" }` |
| `modify` → `DISCONTINUED` + `supersededByGoalId` | Single `tx.goal.update` with both fields |
| `discontinue` → `status=DISCONTINUED` only | Single `tx.goal.update`, no `goal.create` |
| `goal.list` for new plan shows only that plan's goals | Each `goal.create` sets `treatmentPlanId: input.newPlanId` |
| Unassigned therapist → `FORBIDDEN` | `getPlanForTherapist` called on all procedures |
| `applyPlanModificationDecisions` with `newGoals` creates goals | Loop over `newGoals` array before processing decisions |

---

## Out of Scope

- `goal.create` with preset-based templates — handled by `plan.create` when `presetId` supplied.
- Frontend UI for goal tracking — deferred to FE-06.

---

## Verification

1. `pnpm check-types` — must pass across all packages.
2. `pnpm check` (Biome) — tabs/double-quotes/import order on new and edited files.
3. Manual smoke test via `pnpm dev:server` + tRPC:
   - Create a `TreatmentPlan` manually.
   - `goal.create` → confirm `status = IN_PROGRESS`, `currentAttainmentPct = 0`.
   - `goal.list` → confirm created goal returned.
   - `goal.updateAttainment` → confirm `GoalProgressEntry` created and `Goal.currentAttainmentPct` updated.
   - `goal.listProgressHistory` → confirm entry returned ordered by `recordedAt`.
   - `goal.applyPlanModificationDecisions` with `modify` → old goal `DISCONTINUED` + `supersededByGoalId` set; new goal on new plan.
   - `goal.applyPlanModificationDecisions` with `discontinue` → old goal `DISCONTINUED`; no new goal.
   - `goal.applyPlanModificationDecisions` with `newGoals` → confirm goals created with `status=IN_PROGRESS`, `currentAttainmentPct=0`.
   - As unassigned therapist, all procedures throw `FORBIDDEN`.
