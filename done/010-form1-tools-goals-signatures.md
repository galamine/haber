# 010 — Form 1: Tools, Goals, Intervention Plan & Signatures [AFK]

**Type:** AFK  
**PRD User Stories:** 81, 82, 83

## What to build

Complete Form 1 with its final three sections: standardised assessment tools administered (multi-select with per-tool scores summary), the initial goals & intervention plan (short-term and long-term goals, frequency, setting, home program, equipment, referrals), and the dual signatures (therapist typed name + credentials + timestamp + IP; guardian acknowledgment typed name + timestamp + IP). After both signatures are captured, the assessment is fully finalised and clinically/legally complete.

## Acceptance criteria

**Schema / migrations**
- [ ] `AssessmentToolResult` model: `id`, `assessmentId` (FK), `assessmentToolId` (FK to AssessmentTool), `scoresSummary` (text nullable — per-tool free-text scores and percentiles), `createdAt`
- [ ] `Assessment.overallScoresSummary` (text nullable) — free-text overall scores/percentiles summary field
- [ ] `AssessmentInterventionPlan` model: `id`, `assessmentId` (FK, unique), `frequencyPerWeek` (int), `sessionDurationMinutes` (int), `interventionSetting` enum (`clinic` | `home` | `school` | `early_intervention` | `rehab` | `hybrid`), `reviewPeriodWeeks` (int), `homeProgramRecommendations` (text nullable), `equipmentIds` (JSONB array of Equipment IDs), `referralsToSpecialists` (text nullable), `shortTermGoals` (JSONB array of `{ description: string }`, max 4), `longTermGoals` (JSONB array of `{ description: string }`, max 4), `createdAt`, `updatedAt`
- [ ] `AssessmentSignature` model: `id`, `assessmentId` (FK), `signatoryType` enum (`therapist` | `guardian`), `typedName` (string), `credentials` (text nullable — e.g., "BOT, MOT (Pediatrics)"; snapshotted from `User.credentialsQualifications` for therapist), `timestamp` (datetime), `ipAddress` (string), `consentCheckbox` (boolean — for guardian type), `createdAt`
- [ ] Assessment cannot be marked `finalised` until both signatures exist

**API endpoints**
- [ ] `PUT /assessments/:id/tool-results` — upsert administered tool results: `{ toolResults: [{ assessmentToolId, scoresSummary }], overallScoresSummary }`; draft-only
- [ ] `GET /assessments/:id/tool-results` — list tool results
- [ ] `PUT /assessments/:id/intervention-plan` — upsert intervention plan details; draft-only
- [ ] `GET /assessments/:id/intervention-plan` — get intervention plan
- [ ] `POST /assessments/:id/sign` — capture a signature: `{ signatoryType, typedName, credentials, ipAddress, consentCheckbox }`; one per `signatoryType`; idempotent (overwrites if re-submitted before finalisation)
- [ ] `GET /assessments/:id/signatures` — list captured signatures
- [ ] `POST /assessments/:id/finalise` — now validates: both therapist and guardian signatures present; returns 422 `SIGNATURES_REQUIRED` otherwise; on success sets `status: finalised`

**Frontend**
- [ ] Form 1 wizard — **Section 8: Standardised Assessment Tools** — scrollable multi-select checklist of 14 tools; selecting a tool reveals a `scoresSummary` textarea for that tool; overall scores/percentiles free-text at the bottom
- [ ] Form 1 wizard — **Section 9: Initial Goals & Intervention Plan**:
  - Short-term goals: up to 4 text inputs (4–6 weeks horizon)
  - Long-term goals: up to 4 text inputs (3–6 months horizon)
  - Frequency per week, session duration (minutes), intervention setting dropdown, review period (weeks)
  - Home program recommendations textarea
  - Equipment multi-select (from `GET /taxonomies/equipment`)
  - Referrals to other specialists textarea
- [ ] Form 1 wizard — **Section 10: Signatures**:
  - Therapist panel: typed name, credentials (pre-filled from `User.credentialsQualifications`), auto-captured timestamp + IP, "Sign as Therapist" button
  - Guardian panel: guardian name dropdown (from student's guardians), typed name input, "Consent obtained for assessment and treatment" checkbox, auto-captured timestamp + IP, "Record Guardian Acknowledgment" button
- [ ] Both signatures show a green checkmark once captured; "Finalise Assessment" button is enabled only when both are captured

**Tests**
- [ ] `PUT /assessments/:id/tool-results` with 3 tools → 3 `AssessmentToolResult` rows
- [ ] `PUT /assessments/:id/intervention-plan` with `shortTermGoals` array of 5 entries → returns 422 `TOO_MANY_GOALS` (max 4)
- [ ] `POST /assessments/:id/finalise` without therapist signature → returns 422 `SIGNATURES_REQUIRED`
- [ ] `POST /assessments/:id/finalise` with both signatures → returns 200, `Assessment.status` is `finalised`
- [ ] Therapist signature snaps `User.credentialsQualifications` into `credentials` field at signing time (not a live reference)
- [ ] Signed assessment is read-only: `PUT /assessments/:id/tool-results` after finalisation returns 409

## QA / Manual testing

- [ ] Open a draft Form 1 that has completed sections 1–7 (issues 008–009) → navigate to Section 8 → select "SP2" and "BOT-2" → add scores for each → add overall summary
- [ ] Navigate to Section 9 → enter 2 short-term goals, 2 long-term goals, frequency 3/week, duration 60 min, setting "Clinic", review 6 weeks, select "Swing" from equipment
- [ ] Navigate to Section 10 → enter therapist typed name (credentials auto-filled) → click "Sign as Therapist" → green checkmark appears
- [ ] Select a guardian from the dropdown → type their name → check the consent checkbox → click "Record Guardian Acknowledgment" → green checkmark appears
- [ ] "Finalise Assessment" button activates → click it → verify assessment shows in history as version 1, finalised, with both signatures listed
- [ ] Try editing a tool result after finalisation → verify it is blocked with "Assessment Finalised" error

## Blocked by

- Issue 009 — Form 1: Milestones, Sensory Profile & Functional Concerns
