# TEST-03: Assessment, Sensory Profile & Goals Test Suite

## What to build

Integration tests for `GoalService`, `SensoryProfileService`, and `FollowUpAssessmentService` — three of the eight PRD-specified services under test.

**Packages:** `packages/api` (Vitest integration tests)

### Test file locations

```
packages/api/src/__tests__/assessment.test.ts
packages/api/src/__tests__/followup.test.ts
packages/api/src/__tests__/goals.test.ts
packages/api/src/__tests__/sensory.test.ts
```

### GoalService tests (`goals.test.ts`)

```
describe("Horizon assignment")
  - goal.create with horizon=SHORT_TERM creates goal with correct horizon
  - goal.create with horizon=LONG_TERM creates goal with correct horizon

describe("Attainment tracking")
  - goal.updateAttainment updates currentAttainmentPct on the goal
  - Each call to updateAttainment appends a new immutable GoalProgressEntry
  - goal.listProgressHistory returns entries in chronological order

describe("Plan modification lifecycle")
  - action="modify" sets old goal status=DISCONTINUED and supersededByGoalId=newGoal.id
  - new goal is created on the new plan version with the modified description
  - action="discontinue" sets status=DISCONTINUED; no new goal created
  - action="continue" re-links goal to the new plan version
```

### SensoryProfileService tests (`sensory.test.ts`)

```
describe("Baseline capture")
  - Creating an InitialAssessment with sectionD creates 7 SensoryProfile rows linked to assessmentId
  - Each system has the correct rating (1-5)

describe("Follow-up delta")
  - Creating a FollowUpAssessment creates 7 SensoryProfile rows linked to followUpId
  - getFollowUpDelta returns correct change = followUpRating - baselineRating per system
  - Previous follow-up delta is computed correctly when previousFollowUpId is supplied
```

### FollowUpAssessmentService tests (`followup.test.ts`)

```
describe("Links and versioning")
  - createFollowUp links to initialAssessmentId, treatmentPlanId, previousFollowUpId
  - Two follow-ups chain correctly: followUp2.previousFollowUpId = followUp1.id
  - Append-only: existing follow-up records are never modified

describe("Required signatures")
  - createFollowUp without sectionF.guardianName returns validation error
  - createFollowUp without therapistIp returns validation error

describe("Plan adjustment decisions")
  - sectionE.goalStatusDecisions are persisted correctly in JSONB
  - updatedGoals are included in the structured response
```

## Acceptance criteria

- [ ] All described test cases pass on a real test database
- [ ] `GoalProgressEntry` immutability is verified (no update path, only append)
- [ ] 7 SensoryProfile rows per assessment/follow-up are verified
- [ ] Sensory delta correctness is mathematically verified
- [ ] `pnpm --filter api test` passes

## Blocked by

- BE-09 (GoalService implemented)
- BE-08 (FollowUpAssessmentService implemented)
