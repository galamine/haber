# 009 — Form 1: Milestones, Sensory Profile & Functional Concerns [AFK]

**Type:** AFK  
**PRD User Stories:** 23, 78, 79, 80

## What to build

Extend the Form 1 Assessment with three clinical sections: (1) developmental milestone ratings for all 12 seeded milestones, (2) the sensory processing profile rating each of the 7 sensory systems on a 1–5 ordinal scale, and (3) multi-select functional & fine-motor concerns. These sections are the structured data backbone for longitudinal radar charts and the recommender engine. At least one leaf-level milestone must be tagged before an assessment can be finalised.

## Acceptance criteria

**Schema / migrations**
- [ ] `AssessmentMilestone` model: `id`, `assessmentId` (FK), `milestoneId` (FK to Milestone), `achievedAtAgeMonths` (int nullable), `delayed` (boolean), `notes` (text nullable), `createdAt`
- [ ] `AssessmentSensoryRating` model: `id`, `assessmentId` (FK), `sensorySystemId` (FK to SensorySystem), `rating` (int, 1–5), `notes` (text nullable), `createdAt`
- [ ] `AssessmentFunctionalConcern` join model: `assessmentId` (FK), `functionalConcernId` (FK); composite primary key; plus `clinicalObservations` (text nullable) at the assessment level (stored on the `Assessment` record)
- [ ] `Assessment.functionalConcernObservations` (text nullable) — free-text clinical observations for functional concerns section
- [ ] Validation: at least one `AssessmentMilestone` with `delayed: true` OR `achievedAtAgeMonths` non-null must exist (at least one leaf-level milestone is tagged) before `POST /assessments/:id/finalise` is accepted

**API endpoints**
- [ ] `PUT /assessments/:id/milestones` — upsert all milestone ratings for the assessment: accepts array of `{ milestoneId, achievedAtAgeMonths, delayed, notes }`; replaces existing entries; draft-only
- [ ] `GET /assessments/:id/milestones` — list milestone ratings for the assessment
- [ ] `PUT /assessments/:id/sensory-profile` — upsert all 7 sensory system ratings: accepts array of `{ sensorySystemId, rating, notes }`; validates `rating` is 1–5; draft-only
- [ ] `GET /assessments/:id/sensory-profile` — list sensory ratings for the assessment
- [ ] `PUT /assessments/:id/functional-concerns` — upsert functional concern selections: `{ functionalConcernIds[], clinicalObservations }`; draft-only
- [ ] `GET /assessments/:id/functional-concerns` — list selected concerns
- [ ] `POST /assessments/:id/finalise` — now also validates: at least one milestone entry exists; all 7 sensory systems have a rating; returns 422 `MILESTONE_REQUIRED` or `SENSORY_PROFILE_INCOMPLETE` otherwise

**Frontend**
- [ ] Form 1 wizard — **Section 5: Developmental Milestones** — table of all 12 seeded milestones, each row: milestone name, age band, `achievedAtAgeMonths` number input (nullable), `delayed` checkbox, notes textarea
- [ ] Form 1 wizard — **Section 6: Sensory Processing Profile** — 7-row table; each row: sensory system name, 1–5 radio button or slider (labelled: 1=Hypo-responsive, 3=Typical, 5=Hyper-responsive), notes textarea; overall behavioural observations free-text at the bottom
- [ ] Form 1 wizard — **Section 7: Functional & Fine-Motor Concerns** — scrollable multi-select checklist of all 16 functional concerns; clinical observations textarea below
- [ ] Missing milestone validation toast: "Please rate at least one milestone before finalising"
- [ ] Missing sensory profile validation toast: "Please rate all 7 sensory systems before finalising"

**Tests**
- [ ] `PUT /assessments/:id/milestones` with all 12 milestones → 12 `AssessmentMilestone` rows created
- [ ] `PUT /assessments/:id/sensory-profile` with rating 6 → returns 422 `INVALID_RATING`
- [ ] `POST /assessments/:id/finalise` with zero milestone entries → returns 422 `MILESTONE_REQUIRED`
- [ ] `POST /assessments/:id/finalise` with only 6 of 7 sensory systems rated → returns 422 `SENSORY_PROFILE_INCOMPLETE`
- [ ] Updating milestones on a finalised assessment → returns 409 `ASSESSMENT_FINALISED`
- [ ] `PUT /assessments/:id/sensory-profile` is idempotent (re-submitting same data does not create duplicates)

## QA / Manual testing

- [ ] Open a draft Form 1 → navigate to Section 5 → rate 11 of 12 milestones → try to finalise → verify "Milestone Required" error toast
- [ ] Rate the 12th milestone → navigate to Section 6 → rate only 6 of 7 sensory systems → try to finalise → verify "Sensory Profile Incomplete" error
- [ ] Rate the 7th sensory system → navigate to Section 7 → select 3 functional concerns → add clinical observations
- [ ] Try to finalise → verify it proceeds to Section 8 (issue 010 — tools/goals/signatures)
- [ ] After finalisation, try to edit a sensory rating → verify the inputs are read-only

## Blocked by

- Issue 008 — Form 1: Assessment Scaffold & Basic Fields
