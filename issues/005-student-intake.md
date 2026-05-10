# 005 — Student Intake [AFK]

**Type:** AFK  
**PRD User Stories:** 15, 16, 18, 19, 20, 21

## What to build

Any staff member with the `student.intake` permission can create a student profile. The intake collects demographics, medical history, guardian details, and anthropometric data. The system blocks assessment from starting until all required intake fields are complete. Students and guardians are soft-deleted (DPDP-compliant 7-year retention). Hard delete requires co-approval from two admins.

## Acceptance criteria

**Schema / migrations**
- [ ] `Student` model: `id` (UUID), `tenantId` (FK), `studentCode` (auto-generated readable ID e.g. `STU-0001`), `opNumber` (manual, nullable), `fullName`, `dob` (date), `sex` enum (`male` | `female` | `other`), `photoUrl` (nullable), `spokenLanguages` (JSONB array), `school` (nullable), `preferredTherapistId` (nullable FK to User), `heightCm` (nullable decimal), `weightKg` (nullable decimal), `measurementDate` (nullable date), `assignedDoctorIds` (JSONB array of UUIDs), `latestPlanId` (nullable FK), `intakeComplete` (boolean default false), `deleted_at` (nullable timestamp — soft delete), `createdAt`, `updatedAt`
- [ ] `Guardian` model: `id`, `studentId` (FK), `fullName`, `relationship` (free text), `phone`, `email` (nullable), `loginEnabled` (boolean default false), `deleted_at` (nullable), `createdAt`
- [ ] `MedicalHistory` model: `id`, `studentId` (FK, unique), `birthTerm` enum (`term` | `preterm`), `birthComplications` (JSONB nullable), `neonatalHistory` (text nullable), `gestationalAgeWeeks` (int nullable), `immunizations` (text nullable), `allergies` (text nullable), `currentMedications` (JSONB array of `{ name, dose, frequency }`), `priorDiagnoses` (JSONB array), `familyHistory` (text nullable), `sensorySensitivities` (text nullable), `createdAt`, `updatedAt`
- [ ] `HardDeleteRequest` model: `id`, `studentId` (FK), `requestedByUserId` (FK), `approvedByUserId` (nullable FK), `requestedAt`, `approvedAt` (nullable), `status` enum (`pending` | `approved` | `rejected`)

**API endpoints**
- [ ] `POST /students` — requires `student.intake` permission: create student with demographics; returns created student with `intakeComplete: false`
- [ ] `GET /students` — doctor, therapist, clinic_admin: paginated list filtered to caller's `tenant_id`; supports search by name/opNumber
- [ ] `GET /students/:id` — detail; doctors see only their assigned students unless clinic_admin
- [ ] `PATCH /students/:id` — requires `student.intake` permission: update demographics or anthropometrics
- [ ] `PUT /students/:id/medical-history` — upsert structured medical history; `intakeComplete` re-evaluated after each update
- [ ] `POST /students/:id/guardians` — add a guardian to the student
- [ ] `PATCH /students/:id/guardians/:guardianId` — update guardian info
- [ ] `GET /students/:id/intake-status` — returns `{ intakeComplete, missingFields: [] }` — lists which required fields are still empty
- [ ] `DELETE /students/:id` — soft delete: sets `deleted_at = now()` (clinic_admin or super_admin only)
- [ ] `POST /students/:id/hard-delete-request` — clinic_admin: initiates co-approval workflow
- [ ] `POST /students/:id/hard-delete-approve` — second clinic_admin or super_admin: approves and executes hard delete after confirming retention period has passed

**Frontend**
- [ ] Student list page: searchable/sortable table with name, age, OP number, assigned doctor, intake status badge (Complete/Incomplete), active plan status
- [ ] Student create wizard (multi-step):
  - Step 1: Demographics (name, DOB, sex, photo upload, languages, school)
  - Step 2: Guardians (add one or more guardian cards with name, relationship, phone, email)
  - Step 3: Medical History (structured fields + free-text sections)
  - Step 4: Anthropometrics (height, weight, measurement date)
- [ ] Student detail page: tab layout — Profile | Medical History | Guardians | Assessments | Treatment Plan | Sessions
- [ ] Intake status banner on student detail: green "Intake Complete" or amber "Intake Incomplete — missing: [fields]" with link to fix
- [ ] Assessment tab: "Start Assessment" button disabled with tooltip "Complete intake first" if `intakeComplete: false`

**Tests**
- [ ] `POST /students` creates a student with `intakeComplete: false`
- [ ] After filling all required fields, `GET /students/:id/intake-status` returns `{ intakeComplete: true, missingFields: [] }`
- [ ] `GET /students` for a therapist in Clinic B does not return Clinic A students (tenant isolation)
- [ ] Soft delete sets `deleted_at`; soft-deleted student does not appear in list but is retrievable by super_admin for audit
- [ ] Hard delete requires two separate admin approvers — a single admin approving both steps is rejected
- [ ] `preferredTherapistId` must be a user in the same clinic; cross-clinic assignment returns 422

## QA / Manual testing

- [ ] Log in as staff with `student.intake` → navigate to Students → click "New Student" → complete all 4 steps → verify student appears in list with "Intake Complete" badge
- [ ] Create a second student but only complete steps 1 and 2 → verify "Intake Incomplete — missing: Medical History, Anthropometrics" banner appears on their detail page
- [ ] On the Assessments tab for the incomplete student → verify "Start Assessment" button is disabled
- [ ] Log in as clinic_admin → find the second student → click "Soft Delete" → verify they disappear from the student list
- [ ] Log in as super_admin → verify the deleted student is still visible in the audit view with `deleted_at` timestamp

## Blocked by

- Issue 001 — Auth Reform: OTP + Role Expansion
- Issue 003 — Staff Management
