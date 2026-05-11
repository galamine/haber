# 005 — Child Intake [AFK]

**Type:** AFK  
**PRD User Stories:** 15, 16, 18, 19, 20, 21

## Design decisions

- Terminology is **child** throughout (not "student")
- `child.intake` is a **role-level right** added to `allRoles` for `clinic_admin` and `therapist` — not a per-user StaffPermission
- `assignedTherapistIds` replaced by `ChildTherapist` join table (mirrors `UserDepartment`) — no JSONB array
- `childCode` generated via MAX+1 inside the creation transaction; format `CHD-0001`
- `intakeComplete` gates: guardian exists + MedicalHistory record exists + all three anthropometric fields (heightCm, weightKg, measurementDate) non-null
- Photo upload deferred — `photoUrl` is nullable in schema; wizard uses an Avatar placeholder
- Hard delete and `HardDeleteRequest` omitted from this issue

## What to build

Any `clinic_admin` or `therapist` can create a child profile. The intake collects demographics, medical history, guardian details, and anthropometric data. The system blocks assessment from starting until all required intake fields are complete. Children and guardians are soft-deleted (DPDP-compliant 7-year retention). Hard delete is deferred to a future issue.

## Acceptance criteria

**Schema / migrations**
- [ ] `Child` model: `id` (UUID), `tenantId` (FK), `childCode` (auto-generated `CHD-0001` via MAX+1 in transaction), `opNumber` (manual, nullable), `fullName`, `dob` (date), `sex` enum (`male` | `female` | `other`), `photoUrl` (nullable — upload deferred), `spokenLanguages` (JSONB string array), `school` (nullable), `preferredTherapistId` (nullable FK to User, same-tenant validated), `heightCm` (nullable decimal), `weightKg` (nullable decimal), `measurementDate` (nullable date), `latestPlanId` (nullable FK), `intakeComplete` (boolean default false), `deleted_at` (nullable timestamp — soft delete), `createdAt`, `updatedAt`
- [ ] `Guardian` model: `id`, `childId` (FK cascade), `fullName`, `relationship` (free text), `phone`, `email` (nullable), `loginEnabled` (boolean default false), `deleted_at` (nullable), `createdAt`
- [ ] `MedicalHistory` model: `id`, `childId` (FK unique cascade), `birthTerm` enum (`term` | `preterm`), `birthComplications` (JSONB nullable), `neonatalHistory` (text nullable), `gestationalAgeWeeks` (int nullable), `immunizations` (text nullable), `allergies` (text nullable), `currentMedications` (JSONB array of `{ name, dose, frequency }`), `priorDiagnoses` (JSONB string array nullable), `familyHistory` (text nullable), `sensorySensitivities` (text nullable), `createdAt`, `updatedAt`
- [ ] `ChildTherapist` join table: `childId` + `userId` composite PK (both cascade delete) — replaces any JSONB array approach

**API endpoints**
- [ ] `POST /children` — requires `child.intake` right: create child with demographics; returns created child with `intakeComplete: false`
- [ ] `GET /children` — `clinic_admin` sees all tenant children; `therapist` sees only assigned children (via `ChildTherapist`); supports `?name=`, `?opNumber=`, `?includeDeleted=true` (super_admin only), pagination
- [ ] `GET /children/:childId` — detail; `therapist` must be in `ChildTherapist` for this child, else 403; `clinic_admin` requires tenant match only
- [ ] `PATCH /children/:childId` — requires `child.intake` right: update demographics or anthropometrics; re-evaluates `intakeComplete`
- [ ] `PUT /children/:childId/medical-history` — upsert structured medical history; re-evaluates `intakeComplete` after update
- [ ] `POST /children/:childId/guardians` — add a guardian; re-evaluates `intakeComplete`
- [ ] `PATCH /children/:childId/guardians/:guardianId` — update guardian info
- [ ] `GET /children/:childId/intake-status` — returns `{ intakeComplete, missingFields: string[] }` where missingFields values are `'guardian'`, `'medicalHistory'`, `'anthropometrics'`
- [ ] `DELETE /children/:childId` — soft delete: sets `deleted_at = now()` (clinic_admin or super_admin only; enforced in service layer)

**Frontend**
- [ ] Child list page: searchable by name table with columns — Name (link), Age (computed), OP Number, Assigned Therapists, Intake Status badge (Complete/Incomplete)
- [ ] Child create wizard (multi-step, incremental saves — child created on step 1 completion):
  - Step 1: Demographics (fullName, DOB, sex, spokenLanguages via TagInput, school, opNumber; Avatar placeholder for photo)
  - Step 2: Guardians (add guardian cards inline; Next disabled until at least one guardian added)
  - Step 3: Medical History (birthTerm Select, gestationalAgeWeeks, free-text sections, currentMedications as dynamic add/remove rows with name+dose+frequency, priorDiagnoses TagInput)
  - Step 4: Anthropometrics (heightCm, weightKg, measurementDate) → on finish, navigate to child detail
- [ ] Child detail page: tab layout — Profile | Medical History | Guardians | Assessments | Treatment Plan | Sessions
  - Assessments / Treatment Plan / Sessions are stub placeholders this issue
- [ ] Intake status banner on child detail: green "Intake Complete" or amber "Intake Incomplete — missing: [fields]"
- [ ] Assessments tab: "Start Assessment" button disabled with tooltip "Complete intake first" if `intakeComplete: false`

**Tests**
- [ ] `POST /children` creates a child with `intakeComplete: false`
- [ ] After adding a guardian, upserting medical history, and setting all three anthropometrics — `GET /children/:childId/intake-status` returns `{ intakeComplete: true, missingFields: [] }`
- [ ] `GET /children` for a therapist in Clinic B does not return Clinic A children (tenant isolation)
- [ ] Soft delete sets `deleted_at`; child absent from list; retrievable via `?includeDeleted=true` as `super_admin`
- [ ] `PATCH /children/:childId` with `preferredTherapistId` from a different clinic returns 422
- [ ] `GET /children/:childId` as therapist not in `ChildTherapist` for that child returns 403

## QA / Manual testing

- [ ] Log in as `clinic_admin` or `therapist` → navigate to Children → click "New Child" → complete all 4 wizard steps → verify child appears in list with "Intake Complete" badge
- [ ] Create a second child but only complete step 1 → verify "Intake Incomplete — missing: guardian, medicalHistory, anthropometrics" banner on detail page
- [ ] On the Assessments tab for the incomplete child → verify "Start Assessment" button is disabled with tooltip
- [ ] Log in as `clinic_admin` → find a child → soft delete → verify they disappear from the child list
- [ ] Log in as `super_admin` → `GET /children?includeDeleted=true` → verify the deleted child is returned with `deleted_at` timestamp

## Blocked by

- Issue 001 — Auth Reform: OTP + Role Expansion
- Issue 003 — Staff Management
