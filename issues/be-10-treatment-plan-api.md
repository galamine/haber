# BE-10: Treatment Plan Builder & Presets API

## What to build

Implement the full treatment plan lifecycle: creation, per-game configuration, versioned modifications, preset cloning, and lifecycle transitions (activate, pause, resume, extend, close).

**Packages:** `packages/api`, `packages/shared`

Reference file: `clinical-data/treatment-plan-presets.json` (5 clinical presets loaded at API boot).

### tRPC procedures

Add `packages/api/src/router/plan.ts`:

```
plan.create        (assigned therapist) → TreatmentPlan
  input: { childId, name, programLengthWeeks, phases?, startDate?, targetMilestones?,
           sessionDurationMinutes?, presetId? }
  — Creates TreatmentPlan with status=DRAFT, isActive=false, versionNumber=1, parentPlanId=null
  — If presetId supplied: clones preset data into the plan (name, sessionStructure, phases, goals,
    homeProgramRecommendations); sets sourcePresetId for analytics

plan.get           (assigned therapist) → TreatmentPlanWithGames
plan.list          (assigned therapist) → TreatmentPlan[]  (all versions, sorted by versionNumber)
plan.listActive    (assigned therapist) → TreatmentPlan[]  (isActive=true only)

plan.addGame       (assigned therapist) → PlanGameAssignment
  input: { planId, gameVersionId, durationSeconds?, repetitions?, frequencyPerWeek?,
           instructions?, appliesToPhase? }
  — Pinned to specific gameVersionId (game updates don't affect in-flight plans)

plan.removeGame    (assigned therapist) → void
plan.updateGame    (assigned therapist) → PlanGameAssignment
plan.reorderGames  (assigned therapist) → void

plan.checkSessionDuration (assigned therapist) → { totalSeconds, limitSeconds, exceeds: boolean }
  input: { planId }
  — Computes sum of game durations vs plan.sessionDurationMinutes; non-blocking advisory

plan.activate      (assigned therapist) → TreatmentPlan
  input: { planId }
  — Sets status=ACTIVE, isActive=true; triggers SessionGenerator (BE-11)

plan.pause         (assigned therapist) → TreatmentPlan
plan.resume        (assigned therapist) → TreatmentPlan
plan.extend        (assigned therapist) → TreatmentPlan  (updates programLengthWeeks)

plan.close         (assigned therapist) → TreatmentPlan
  input: { planId, closureReason, outcomeSummary }

plan.modify        (assigned therapist) → TreatmentPlan
  input: { planId, changes: Partial<PlanFields>, goalDecisions: ModificationDecisionInput[] }
  — Sets current version isActive=false
  — Creates new TreatmentPlan row with versionNumber+1, parentPlanId=currentId, isActive=true
  — Calls goal.applyPlanModificationDecisions internally
  — Triggers session regeneration for affected future dates (BE-11)

plan.listPresets   (protected) → PlanPreset[]
  — Returns the 5 presets from clinical-data/treatment-plan-presets.json (loaded at boot)
```

### Preset loading

In `packages/api/src/index.ts`, load `clinical-data/treatment-plan-presets.json` at startup and make it available to `plan.listPresets` via a module-level constant (no database storage for presets).

### Shared schemas

Add:
- `CreatePlanInput`, `ModifyPlanInput`, `AddGameInput`, `TreatmentPlanSchema`, `PlanPresetSchema`

## Acceptance criteria

- [ ] `plan.create` with `presetId = "asd"` clones the ASD preset data into the plan with `sourcePresetId` set
- [ ] Cloned preset plan is fully editable immediately; preset changes do not propagate
- [ ] `plan.addGame` pins the plan to the specific `gameVersionId`
- [ ] `plan.checkSessionDuration` returns `exceeds: true` when sum exceeds `sessionDurationMinutes`; does NOT block saving
- [ ] `plan.modify` creates a new plan version row with `parentPlanId` set and incremented `versionNumber`
- [ ] Old plan version's `isActive` is set to `false` after `plan.modify`
- [ ] `plan.list` for a child returns all versions; `plan.listActive` returns only one
- [ ] `plan.close` sets status to `CLOSED` and persists `closureReason`
- [ ] `plan.listPresets` returns all 5 presets without a database query
- [ ] `pnpm typecheck` passes

## Blocked by

- BE-07 (child must have a completed assessment before a plan is meaningful)
- BE-02 (milestones and taxonomy used in plan goals)
- BE-01c (TreatmentPlan, PlanGameAssignment, Goal models)
