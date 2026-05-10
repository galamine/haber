# 019 — Follow-Up Assessment — Form 2 [AFK]

**Type:** AFK  
**PRD User Stories:** 84–90

## What to build

Implement the structured follow-up assessment (Form 2), conducted every 4–6 sessions or when clinically indicated. Form 2 links to the initial assessment and the previous follow-up, captures goal progress review, sensory progress (re-rated + delta vs. baseline), qualitative clinical questions, plan adjustment decisions, and dual signatures. All follow-ups are append-only; the chain of linked records enables longitudinal queries.

## Acceptance criteria

**Schema / migrations**
- [ ] `FollowUpAssessment` model: `id`, `studentId` (FK), `tenantId` (FK), `treatmentPlanId` (FK), `initialAssessmentId` (FK to Assessment), `previousFollowUpId` (nullable FK — self-referential to prior follow-up), `followUpDate` (date), `sessionNumber` (int), `weeksSinceInitialAssessment` (int), `parentCaregiverPresent` (boolean), `homeProgramCompliance` enum (`excellent` | `good` | `partial` | `minimal` | `not_started`), `childEngagement` enum (`excellent` | `good` | `fair` | `poor`), `schoolPerformanceChanges` (text nullable), `behaviourChanges` (text nullable), `newSkillsObserved` (text nullable), `equipmentEffectivelyUsed` (text nullable), `clinicalObservations` (text nullable), `goalAdjustmentDecisions` (JSONB array of `{ type: 'continue_all' | 'modify_existing' | 'add_new' | 'discontinue' | 'refer_to_specialist' }`), `updatedHomeProgramNotes` (text nullable), `updatedSensoryDietNotes` (text nullable), `nextFollowUpDate` (date nullable), `nextAssessmentType` (text nullable), `teamNotes` (text nullable), `status` enum (`draft` | `finalised`), `createdAt`, `updatedAt`
- [ ] `FollowUpGoalReview` model: `id`, `followUpId` (FK), `goalId` (FK to Goal), `attainmentPct` (int 0–100), `status` enum (`met` | `in_progress` | `not_met`), `evidenceNotes` (text nullable), `createdAt` — links to `GoalProgressEntry` (issue 013) to persist the attainment update
- [ ] `FollowUpSensoryRating` model: `id`, `followUpId` (FK), `sensorySystemId` (FK), `rating` (int 1–5), `changeVsBaseline` (int computed: `rating - initialAssessment.sensoryRating`), `changeVsPreviousFollowUp` (int nullable), `notes` (text nullable), `createdAt`
- [ ] `FollowUpSignature` model: mirrors `AssessmentSignature` — `id`, `followUpId` (FK), `signatoryType` enum (`therapist` | `guardian`), `typedName`, `credentials` (nullable), `timestamp`, `ipAddress`, `consentCheckbox` (boolean for guardian), `createdAt`

**API endpoints**
- [ ] `POST /follow-ups` — therapist only: `{ studentId, treatmentPlanId, initialAssessmentId, previousFollowUpId?, followUpDate, sessionNumber, weeksSince, parentPresent }` — creates a draft follow-up; auto-fetches active goals from the treatment plan for review
- [ ] `GET /follow-ups?studentId=:id` — list all follow-ups for a student (newest first)
- [ ] `GET /follow-ups/:id` — full follow-up detail
- [ ] `PATCH /follow-ups/:id` — update draft qualitative fields; draft-only
- [ ] `PUT /follow-ups/:id/goal-reviews` — upsert goal progress review for all active goals: `[{ goalId, attainmentPct, status, evidenceNotes }]`; each entry also triggers `POST /goals/:goalId/progress` logic to append a `GoalProgressEntry`
- [ ] `PUT /follow-ups/:id/sensory-ratings` — upsert sensory re-ratings; computes `changeVsBaseline` by looking up the initial assessment's sensory ratings; computes `changeVsPreviousFollowUp` if `previousFollowUpId` exists
- [ ] `POST /follow-ups/:id/sign` — same as assessment signature capture: `{ signatoryType, typedName, credentials?, ipAddress, consentCheckbox? }`
- [ ] `POST /follow-ups/:id/finalise` — validates: all active goals have a review, all 7 sensory systems re-rated, both signatures present; returns 422 otherwise; sets `status: finalised`

**Frontend**
- [ ] "Start Follow-Up Assessment" button on student Assessments tab (visible after initial assessment is finalised; enabled after every 4th session or at any time for "clinically indicated")
- [ ] Form 2 wizard — **Section 1: Session Info** — auto-filled from session data; parent presence toggle
- [ ] Form 2 wizard — **Section 2: Goal Progress Review** — card per active goal: current attainment % slider, status dropdown, evidence notes; shows target vs. current side by side
- [ ] Form 2 wizard — **Section 3: Sensory Progress Check** — re-rate 7 systems; each row shows: system name, initial baseline rating (read-only), new rating input (1–5), computed delta badge (e.g., "+1 Improved" in green, "-1 Declined" in red)
- [ ] Form 2 wizard — **Section 4: Clinical Questions** — compliance, engagement, school performance, behaviour, new skills, equipment used, clinical observations (all text/enum fields)
- [ ] Form 2 wizard — **Section 5: Plan Adjustment & Next Steps** — goal decisions multi-select, updated home program/sensory diet notes, next follow-up date picker, team notes
- [ ] Form 2 wizard — **Section 6: Signatures** — same dual-signature panel as Form 1

**Tests**
- [ ] Creating a follow-up auto-fetches all active goals from the treatment plan
- [ ] `PUT /follow-ups/:id/sensory-ratings` computes `changeVsBaseline` correctly (e.g., initial rating 2, new rating 4 → `changeVsBaseline: +2`)
- [ ] `PUT /follow-ups/:id/sensory-ratings` computes `changeVsPreviousFollowUp` by comparing with previous follow-up's ratings
- [ ] `POST /follow-ups/:id/finalise` with missing goal review → 422 `GOAL_REVIEWS_INCOMPLETE`
- [ ] `PUT /follow-ups/:id/goal-reviews` creates `GoalProgressEntry` rows and updates `Goal.currentAttainmentPct`
- [ ] Follow-up is linked in a chain: `followUp2.previousFollowUpId = followUp1.id`; longitudinal query traverses the chain
- [ ] Therapist not assigned to the student cannot create a follow-up (403)

## QA / Manual testing

- [ ] Log in as therapist → open a student with a finalised Form 1 and 4+ completed sessions → click "Start Follow-Up Assessment"
- [ ] Section 2: review all goals — set goal 1 to 60% "In Progress", goal 2 to 100% "Met" with evidence notes → next
- [ ] Section 3: re-rate all 7 sensory systems → verify the delta badges show correct changes vs. the initial baseline
- [ ] Section 4: select compliance "Good", engagement "Excellent", add clinical observations
- [ ] Section 5: select "Continue All" for goal decisions, set next follow-up date 6 weeks out
- [ ] Section 6: sign as therapist → record guardian acknowledgment → finalise
- [ ] Verify the follow-up appears in the student's history tab; open goal 1 and verify the `GoalProgressEntry` shows 60% with today's date
- [ ] Start a second follow-up → verify `previousFollowUpId` points to the first one

## Blocked by

- Issue 010 — Form 1: Tools, Goals, Intervention Plan & Signatures
- Issue 015 — Session Generation & Queue
