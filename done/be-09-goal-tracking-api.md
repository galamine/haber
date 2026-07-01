# BE-09: Goal Tracking API

## What to build

Implement first-class goal CRUD, attainment tracking, and the plan-modification goal lifecycle (continue / modify → new row + discontinue old / add / discontinue).

**Packages:** `packages/api`, `packages/db`

### tRPC procedures

Add `packages/api/src/routers/goal.ts`:

```
goal.list          (assigned therapist) → Goal[]
  input: { treatmentPlanId }
  — Returns all goals for the plan (including DISCONTINUED); use status filter to show active

goal.create        (assigned therapist) → Goal
  input: { treatmentPlanId, description, horizon, targetAttainmentPct }
  — Creates Goal with status = IN_PROGRESS, currentAttainmentPct = 0

goal.updateAttainment (assigned therapist) → Goal
  input: { goalId, attainmentPct, status, evidenceNotes, followUpId }
  — Updates Goal.currentAttainmentPct and Goal.status
  — Appends a GoalProgressEntry (immutable history)

goal.applyPlanModificationDecisions (assigned therapist) → { continued, modified, added, discontinued }
  input: {
    decisions: Array<{
      goalId: string,
      action: "continue" | "modify" | "discontinue",
      newDescription?: string,        // for "modify"
      newHorizon?: GoalHorizon,       // for "modify"
      newTargetPct?: number           // for "modify"
    }>,
    newGoals: GoalTemplate[],         // for "add"
    newPlanId: string                 // the new plan version's id
  }
  — "continue": re-links goal to newPlanId (adds treatmentPlanId to goal or creates copy)
  — "modify": sets old goal status = DISCONTINUED + supersededByGoalId = newGoal.id,
              creates new Goal on newPlanId
  — "discontinue": sets goal status = DISCONTINUED
  — "add" (from newGoals): creates new Goal on newPlanId

goal.listProgressHistory (assigned therapist) → GoalProgressEntry[]
  input: { goalId }
  — Returns all progress entries in chronological order for a single goal
```

### Shared schemas

Add:
- `CreateGoalInput`, `UpdateGoalAttainmentInput`, `PlanModificationDecisionInput`
- `GoalSchema`, `GoalProgressEntrySchema`

## Acceptance criteria

- [ ] `goal.create` creates a goal with `status = IN_PROGRESS` and `currentAttainmentPct = 0`
- [ ] `goal.updateAttainment` updates the goal AND appends an immutable `GoalProgressEntry`
- [ ] `goal.listProgressHistory` returns all progress entries ordered by `recordedAt`
- [ ] `applyPlanModificationDecisions` with `action = "modify"` sets `oldGoal.status = DISCONTINUED` and `oldGoal.supersededByGoalId = newGoal.id`
- [ ] `applyPlanModificationDecisions` with `action = "discontinue"` sets `status = DISCONTINUED` without creating a new goal
- [ ] After modification, `goal.list` for the new plan version shows only goals belonging to that plan
- [ ] Unassigned therapist receives `FORBIDDEN`
- [ ] `pnpm check-types` passes

## Blocked by

- BE-07 (InitialAssessment creates the first goals via sectionG; plan must exist)
- BE-01c (Goal, GoalProgressEntry models)
