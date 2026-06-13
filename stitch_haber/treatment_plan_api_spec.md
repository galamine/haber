# Treatment Plan API Specification (`plan.ts`)

This document defines the backend procedures and shared schemas for the Treatment Plan lifecycle in HaberApp.

## 1. Shared Schemas (`packages/shared/src/schemas/plan.ts`)

### 1.1 `TreatmentPlanSchema`
- `id`: string (ULID)
- `childId`: string
- `versionNumber`: number
- `parentPlanId`: string | null
- `status`: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED'
- `isActive`: boolean
- `name`: string
- `programLengthWeeks`: number
- `sessionDurationMinutes`: number
- `startDate`: Date | null
- `targetMilestones`: string[]
- `sourcePresetId`: string | null
- `phases`: Phase[]
- `homeProgramRecommendations`: string | null
- `closureReason`: string | null
- `outcomeSummary`: string | null

### 1.2 `Phase`
- `phase`: string (slug)
- `label`: string
- `weeks`: number

### 1.3 `ModificationDecisionInput`
- `goalId`: string
- `decision`: 'CONTINUE' | 'MODIFY' | 'DISCONTINUE'
- `updatedDescription`: string | null

## 2. tRPC Procedures (`packages/api/src/router/plan.ts`)

### `plan.create`
- **Input**: `{ childId, name, programLengthWeeks, phases?, startDate?, targetMilestones?, sessionDurationMinutes?, presetId? }`
- **Logic**:
  - Initializes plan with `status=DRAFT`, `isActive=false`, `versionNumber=1`.
  - If `presetId` is provided, clones: `name`, `sessionStructure` (into `phases`), `goals` (via `goal.create` linked to plan), and `homeProgramRecommendations`.
  - Sets `sourcePresetId`.

### `plan.modify`
- **Input**: `{ planId, changes: Partial<PlanFields>, goalDecisions: ModificationDecisionInput[] }`
- **Logic**:
  - Sets the current plan version to `isActive=false`.
  - Creates a new TreatmentPlan record with `versionNumber = current.versionNumber + 1`.
  - Links `parentPlanId = planId`.
  - Iterates through `goalDecisions`:
    - `CONTINUE`: Clones goal to the new plan.
    - `MODIFY`: Clones goal with the `updatedDescription`.
    - `DISCONTINUE`: Marks goal as discontinued (does not clone to new plan).
  - Triggers session regeneration for future dates.

### `plan.checkSessionDuration`
- **Input**: `{ planId }`
- **Output**: `{ totalSeconds, limitSeconds, exceeds: boolean }`
- **Logic**: Sums `durationSeconds` from all `PlanGameAssignment` records for the plan vs. `sessionDurationMinutes * 60`.

### `plan.listPresets`
- **Output**: `PlanPreset[]`
- **Logic**: Returns the 5 static presets from `treatment-plan-presets.json`.
