# 008 — Form 1: Assessment Scaffold & Basic Fields [AFK]

**Type:** AFK  
**PRD User Stories:** 22, 24, 25, 76, 77

## What to build

Create the `Assessment` (Form 1) entity with its foundational sections: patient/referral information (auto-populated from the student profile) and medical/developmental history (structured fields). Assessments are append-only and versioned — subsequent reviews create a new record, never overwriting the prior. Assessments are scoped to the student's assigned doctors. This issue is the scaffold that issues 009 and 010 extend.

## Acceptance criteria

**Schema / migrations**
- [ ] `Assessment` model: `id`, `studentId` (FK), `tenantId` (FK), `version` (int, auto-incremented per student), `status` enum (`draft` | `finalised`), `assessmentDate` (date), `assessmentLocation` (text nullable), `referringDoctor` (text nullable), `referralSource` (text nullable), `chiefComplaint` (text nullable), `chiefComplaintTags` (JSONB array of strings — multi-select), `observations` (text nullable), `findings` (JSONB structured per body system + free text), `notes` (text nullable), `primaryDiagnosisIds` (JSONB array of Diagnosis IDs), `recordedByUserId` (FK to User), `createdAt`, `updatedAt`
- [ ] `MedicalHistorySnapshot` JSONB field on `Assessment`: captures the medical history at assessment time (prenatal, birth, neonatal, gestational age, past medical/surgical, medications, allergies, previous therapies + duration) — snapshotted from `MedicalHistory` at the time of assessment creation
- [ ] Unique constraint: only one `draft` assessment per student at a time; `finalised` assessments accumulate as a versioned history
- [ ] Index on `Assessment(studentId, version)` for longitudinal queries

**API endpoints**
- [ ] `POST /assessments` — doctor only (must be assigned to the student): creates a new draft Assessment for a student; auto-populates patient/referral info from the student profile; returns `{ id, version, status: 'draft' }`. Blocked if `intakeComplete: false` or `allConsented: false` (returns 422 with appropriate error code)
- [ ] `GET /assessments?studentId=:id` — list all assessments for a student (append-only history), newest first; only accessible to assigned doctors and clinic_admin
- [ ] `GET /assessments/:id` — full assessment detail
- [ ] `PATCH /assessments/:id` — update draft fields (chief complaint, observations, findings, notes, diagnoses); only allowed while `status: draft`
- [ ] `POST /assessments/:id/finalise` — mark assessment as finalised (triggers issues 009 and 010 signature section); cannot be edited after finalisation
- [ ] Assessments from other doctors on the same student are not visible (unless caller is clinic_admin)

**Frontend**
- [ ] "Start Assessment" button on student Assessments tab → creates a draft and navigates to Form 1 wizard
- [ ] Form 1 wizard — **Section 1: Patient & Referral Info** (auto-filled, read-only fields from student profile + editable: assessment date, location, referring doctor, referral source)
- [ ] Form 1 wizard — **Section 2: Chief Complaint & Observations** (multi-select tags + free text chief complaint; free-text observations; structured findings per body system; clinical notes)
- [ ] Form 1 wizard — **Section 3: Medical & Developmental History** (pre-filled from intake medical history, editable within assessment: prenatal, birth, neonatal, gestational age, medications, allergies, previous therapies)
- [ ] Form 1 wizard — **Section 4: Diagnoses** (multi-select from taxonomy `GET /taxonomies/diagnoses` with `other` free-text field)
- [ ] Assessment history tab on student detail: read-only cards for each finalised assessment with version number and date
- [ ] Draft assessment shows "In Progress" badge; finalised shows date and version

**Tests**
- [ ] Doctor creates an assessment for an assigned student → `version: 1`, `status: draft`
- [ ] Finalising assessment 1 and creating a new draft → `version: 2`; version 1 is still readable
- [ ] Doctor from a different team cannot `GET /assessments?studentId=:id` (returns 403)
- [ ] `POST /assessments` when `intakeComplete: false` returns 422 `INTAKE_INCOMPLETE`
- [ ] `POST /assessments` when `allConsented: false` returns 422 `CONSENT_REQUIRED`
- [ ] `PATCH /assessments/:id` on a `finalised` assessment returns 409 `ASSESSMENT_FINALISED`
- [ ] Only one draft per student at a time — second `POST /assessments` while one is in draft returns 409 `DRAFT_EXISTS`

## QA / Manual testing

- [ ] Log in as doctor → open a student with complete intake and consent → click "Start Assessment" → verify Form 1 wizard opens with patient info pre-filled
- [ ] Fill in chief complaint (select "Sensory Processing Difficulties" + add free text), observations, body system findings, diagnoses → save as draft → close and reopen → verify all fields persisted
- [ ] Click "Finalise" → verify assessment shows version 1 with today's date in the history tab
- [ ] Click "Start New Assessment" → verify a version 2 draft is created without overwriting version 1
- [ ] Log in as a different doctor not assigned to this student → try to access the assessment URL directly → verify 403

## Blocked by

- Issue 005 — Student Intake
- Issue 006 — Guardian Consent
- Issue 007 — Clinical Taxonomy Seeding
