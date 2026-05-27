# BE-08: Follow-Up Assessment Form 2 API

## What to build

Implement the *Haber Specialisto* follow-up assessment (Form 2). Conducted every 4–6 sessions or when clinically indicated. Linked to the initial assessment, active treatment plan, and previous follow-up. Append-only.

**Packages:** `packages/api`, `packages/db`

Reference file: `clinical-data/follow-up-assessment.example.json`

### tRPC procedures

Add to `packages/api/src/routers/assessment.ts`:

```
assessment.createFollowUp  (assigned therapist) → FollowUpAssessment
  input: {
    childId,
    initialAssessmentId,
    treatmentPlanId,
    previousFollowUpId?,
    sectionA: { date, therapistId, sessionNumber, weeksSinceInitial, parentPresent },
    sectionB: { goalProgress: GoalProgressInput[] },
      // GoalProgressInput: { goalId, attainmentPct, status, evidenceNotes }
    sectionC: { sensoryCheck: SensoryCheckInput[] },
      // SensoryCheckInput: { systemId, rating 1-5, notes }
      // delta vs baseline computed server-side from InitialAssessment SensoryProfile
    sectionD: { improvementsAtHome, improvementsAtSchool, regressions?,
                homeProgramCompliance, sessionEngagement, schoolPerformanceChanges,
                behaviourChanges, newSkillsObserved, equipmentEffectivelyUsed,
                therapistObservations },
    sectionE: { goalStatusDecisions: string[], updatedGoals: GoalTemplate[],
                updatedHomeProgram, nextFollowUpDate, nextAssessmentType,
                clinicalNotes },
    sectionF: { therapistName, therapistCredentials, therapistIp,
                guardianName, guardianIp }
  }
  — Creates FollowUpAssessment row
  — Creates GoalProgressEntry for each goal in sectionB
  — Creates 7 SensoryProfile rows from sectionC (linked to followUpId)
  — Computes sensory change delta: rating(followUp) - rating(initialAssessment baseline)

assessment.getFollowUp     (assigned therapist) → FollowUpAssessment
assessment.listFollowUps   (assigned therapist) → FollowUpAssessment[]
assessment.getFollowUpDelta (assigned therapist) → SensoryDelta[]
  input: { followUpId }
  — Returns per-system { system, baseline, current, change } for charting
```

### Sensory delta computation

When `createFollowUp` is called:
1. Load the child's initial assessment's `SensoryProfile` rows (baseline)
2. Load the previous follow-up's `SensoryProfile` rows (if `previousFollowUpId` exists)
3. Compute `change = currentRating - baselineRating` for each system
4. Store the computed delta in the `FollowUpAssessment.sectionC` JSONB alongside the ratings

### Goal progress entries

For each `GoalProgressInput` in sectionB, create a `GoalProgressEntry` and update `Goal.currentAttainmentPct` and `Goal.status` to the latest values.

### Shared schemas

Add:
- `CreateFollowUpInput` with Zod validation
- `GoalProgressInputSchema`, `SensoryCheckInputSchema`
- `FollowUpAssessmentSchema`, `SensoryDeltaSchema`

## Acceptance criteria

- [ ] `assessment.createFollowUp` creates a `FollowUpAssessment` linked to the initial assessment and active plan
- [ ] `GoalProgressEntry` rows are created for each goal in sectionB
- [ ] `Goal.currentAttainmentPct` is updated to the latest attainment value
- [ ] 7 `SensoryProfile` rows created from sectionC with `followUpId` set (not `assessmentId`)
- [ ] Sensory delta (change vs baseline) is computed and stored in sectionC JSONB
- [ ] `assessment.getFollowUpDelta` returns correct per-system delta vs initial baseline
- [ ] Follow-up is linked to `previousFollowUpId` if supplied
- [ ] Unassigned therapist receives `FORBIDDEN` on any follow-up procedure
- [ ] `pnpm check-types` passes

## Blocked by

- BE-07 (InitialAssessment and SensoryProfile baseline must exist)
