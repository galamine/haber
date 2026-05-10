# 026 — Audit Logging & DPDP Compliance [AFK]

**Type:** AFK  
**PRD User Stories:** 72–75, 20, 21

## What to build

Implement the audit and compliance layer: append-only history tables for key entities (Student, TreatmentPlan, Assessment), field-level AES-256 encryption for PHI fields (medical history, diagnoses), and the Clinic Admin tools to fulfill DPDP data principal rights requests (access, correction, erasure, grievance). The hard-delete co-approval workflow (from issue 005) is wired up here with full audit logging.

## Acceptance criteria

**Schema / migrations**
- [ ] `StudentHistory` model: `id`, `studentId` (FK), `changedByUserId` (FK), `changeType` enum (`created` | `updated` | `soft_deleted` | `hard_delete_requested` | `hard_delete_approved` | `consent_captured` | `consent_withdrawn`), `diff` (JSONB — field-level diff of changed values), `ipAddress` (string), `timestamp` (datetime)
- [ ] `PlanHistory` model: `id`, `treatmentPlanId` (FK), `changedByUserId` (FK), `changeType` enum (`created` | `activated` | `modified` | `paused` | `resumed` | `closed` | `completed`), `diff` (JSONB), `ipAddress`, `timestamp`
- [ ] `AssessmentHistory` model: `id`, `assessmentId` (FK), `changedByUserId` (FK), `changeType` enum (`created` | `section_updated` | `finalised`), `sectionName` (text nullable), `diff` (JSONB), `ipAddress`, `timestamp`
- [ ] `AuditLog` model (for auth events): `id`, `actorUserId` (FK nullable — null for system events), `tenantId` (FK nullable), `eventType` enum (`sign_in` | `sign_out` | `role_changed` | `phi_accessed` | `otp_requested` | `otp_verified_failed`), `ipAddress`, `entityType` (text nullable), `entityId` (UUID nullable), `metadata` (JSONB), `timestamp`
- [ ] PHI fields encrypted at rest: `MedicalHistory.currentMedications`, `MedicalHistory.allergies`, `MedicalHistory.priorDiagnoses`, `MedicalHistory.familyHistory`, `Assessment.findings` (body system findings) — encrypted using AES-256-GCM with a key stored in environment config (not in the DB)
- [ ] `DPDPRequest` model: `id`, `tenantId` (FK), `studentId` (FK nullable), `requestType` enum (`access` | `correction` | `erasure` | `grievance`), `requestedByGuardianId` (FK nullable), `status` enum (`open` | `in_progress` | `resolved` | `rejected`), `details` (text), `resolutionNotes` (text nullable), `resolvedAt` (timestamp nullable), `createdAt`

**API endpoints**
- [ ] `GET /audit/students/:id/history` — clinic_admin or super_admin: full change history for a student, newest first
- [ ] `GET /audit/treatment-plans/:id/history` — plan modification history
- [ ] `GET /audit/log` — super_admin only: paginated auth/PHI audit log with filters (eventType, actorUserId, dateRange)
- [ ] `POST /dpdp/requests` — clinic_admin only: create a DPDP request on behalf of a guardian: `{ studentId, requestType, details }`
- [ ] `GET /dpdp/requests` — clinic_admin: list open DPDP requests for their clinic; super_admin sees all
- [ ] `PATCH /dpdp/requests/:id` — clinic_admin: update status and add resolution notes
- [ ] `POST /students/:id/hard-delete-approve` (from issue 005): wired up here to append a `StudentHistory` entry with `changeType: 'hard_delete_approved'` and execute the hard delete only if retention period has passed (`deleted_at + 7 years <= now()`)
- [ ] PHI access middleware: any `GET` of student medical history or assessment findings appends an `AuditLog` entry with `eventType: 'phi_accessed'`

**Frontend**
- [ ] Student history tab on student detail page (clinic_admin only): chronological list of change events with actor, change type, diff summary, timestamp
- [ ] DPDP Requests page (clinic_admin): list of open requests with type badge, student name, submission date, status; "Resolve" button opens a notes textarea
- [ ] Super Admin audit log page: searchable/filterable table of all auth and PHI access events across all clinics

**Tests**
- [ ] Creating a student appends a `StudentHistory` row with `changeType: 'created'`
- [ ] Updating a student's name appends a `StudentHistory` row with `diff: { fullName: { from: 'Old', to: 'New' } }`
- [ ] Soft-deleting a student appends `changeType: 'soft_deleted'`
- [ ] `GET /students/:id/medical-history` appends an `AuditLog` row with `eventType: 'phi_accessed'`
- [ ] PHI fields are stored encrypted in the DB; raw SQL query shows ciphertext, not plaintext
- [ ] Hard delete approval when `deleted_at` was 6 years ago returns 422 `RETENTION_PERIOD_NOT_ELAPSED` (7 years required)
- [ ] Hard delete approval after 7+ years executes the delete and appends final history entry
- [ ] DPDP request created by Clinic A admin is not visible to Clinic B admin

## QA / Manual testing

- [ ] Create a student → update their name → navigate to the student's History tab as clinic_admin → verify two entries: "Created" and "Updated (fullName changed)"
- [ ] Activate a treatment plan → modify it twice → navigate to Plan History → verify three entries: "Activated", "Modified v2", "Modified v3"
- [ ] Access the student's medical history (as a doctor) → log in as super_admin → navigate to Audit Log → verify a `phi_accessed` event appears for that doctor's user ID
- [ ] Inspect the `MedicalHistory` table directly via psql → verify `currentMedications` column shows ciphertext, not plain JSON
- [ ] Log in as clinic_admin → navigate to DPDP Requests → click "New Request" → select type "Access", enter details → create → verify it appears in the list as "Open"
- [ ] Click "Resolve" → add resolution notes → save → verify status changes to "Resolved"
- [ ] Try to approve a hard delete for a student soft-deleted 2 years ago → verify "Retention period not elapsed" error

## Blocked by

- Issue 005 — Student Intake
- Issue 006 — Guardian Consent
