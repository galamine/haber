# BE-07: Initial Assessment Form 1 API

## What to build

Implement the *Haber Specialisto* initial assessment (Form 1). All 8 sections must be captured and stored. Assessment records are versioned append-only (never overwritten). Therapist credentials are snapshotted at signing time.

**Packages:** `packages/api`, `packages/shared`

Reference files: `clinical-data/initial-assessment.example.json` (full shape), `clinical-data/clinical-taxonomies.seed.json` (valid enum values).

### tRPC procedures

Add `packages/api/src/router/assessment.ts`:

```
assessment.create  (assigned therapist with implicit permission) → InitialAssessment
  input: {
    childId,
    sectionA: { patientName, dob, age, gender, assessmentDate, location, referringTherapist,
                referralSource, caregiverName, caregiverRelation, caregiverContact,
                caregiverEmail, chiefComplaint },
    sectionB: { primaryDiagnoses: string[], prenatalHistory, birthHistory, neonatalHistory,
                gestationalAgeWeeks?, medicalHistory, currentMedications, allergies,
                previousTherapies },
    sectionC: { milestones: MilestoneEntry[] },  // 12 items: { milestoneId, achievedAtAgeMonths?, delayed, notes }
    sectionD: { sensoryProfile: SensoryRating[], behaviouralObservations },  // 7 systems: { systemId, rating 1-5, notes }
    sectionE: { functionalConcerns: string[], observations },
    sectionF: { toolsAdministered: ToolEntry[], overallSummary },  // { toolId, scoresSummary }
    sectionG: { shortTermGoals: GoalTemplate[], longTermGoals: GoalTemplate[],
                recommendedFrequency, sessionDurationMinutes, interventionSetting,
                reviewPeriodWeeks, homeProgramRecommendations, equipment: string[],
                referrals },
    sectionH: { therapistName, therapistCredentials, therapistIp,
                guardianName, guardianIp, consentObtained: true }
  }
  — Must check: Child.consentStatus === GRANTED (throw PRECONDITION_FAILED if not)
  — Must check: child has no existing active assessment (throw CONFLICT if exists)
  — Snapshots therapist credentials from User at signing time into sectionH
  — Tags at least one milestone (sectionC must have at least one item with milestoneId)

assessment.get     (assigned therapist) → InitialAssessment
assessment.list    (assigned therapist) → InitialAssessment[]  (all versions for child)

assessment.review  (assigned therapist) → InitialAssessment
  — Appends a new version (versionNumber increments); does NOT overwrite prior version
  — Same input shape as create; previous version's id is preserved
```

### Shared schemas

Add:
- `CreateAssessmentInput` with Zod validation for all 8 sections
- `MilestoneEntrySchema`, `SensoryRatingSchema`, `ToolEntrySchema`, `GoalTemplateSchema`
- `InitialAssessmentSchema`

### SensoryProfile records

When an `InitialAssessment` is created, also create 7 `SensoryProfile` rows (one per system from sectionD) linked to the assessment. These are the baseline for follow-up delta calculations.

## Acceptance criteria

- [ ] `assessment.create` fails with `PRECONDITION_FAILED` if child has `consentStatus !== GRANTED`
- [ ] `assessment.create` fails with `CONFLICT` if the child already has an active assessment version
- [ ] `assessment.create` requires at least one milestone in sectionC (Zod validation)
- [ ] Therapist credentials are snapshotted into sectionH at signing time (not linked live to User)
- [ ] 7 `SensoryProfile` rows are created from sectionD ratings on successful create
- [ ] `assessment.review` creates a new version row; prior version still exists in the database
- [ ] Unassigned therapist cannot call `assessment.get` for a child they don't cover — receives `FORBIDDEN`
- [ ] All assessment records scoped to tenant
- [ ] `pnpm typecheck` passes

## Blocked by

- BE-06 (consent gate must exist before assessments can be created)
- BE-02 (taxonomy seed must be loaded to validate milestone/sensory system IDs)
