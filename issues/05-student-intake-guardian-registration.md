# 05-student-intake-guardian-registration

## What to build

Student profile management: create student with full intake data (OP number, name, DOB, sex, photo, guardian info, medical history, languages, school, preferred therapist), register guardians as user records without login, soft-delete with DPDP compliance.

## Acceptance criteria

- [ ] `POST /v1/students` — create student profile with all intake fields
- [ ] `GET /v1/students` — paginated list, filterable by status, assigned doctor
- [ ] `GET /v1/students/:id` — full student profile with guardians, medical history
- [ ] `PATCH /v1/students/:id` — update student profile
- [ ] `DELETE /v1/students/:id` — soft delete (sets `deleted_at`, does NOT remove data)
- [ ] Student intake completeness tracker: `intake_complete` flag, blocks assessment if false
- [ ] Guardian registration: `POST /v1/students/:id/guardians` — creates Guardian record with name, relation, phone, email; creates User record with `login_enabled=false` for V2 parent portal attachability
- [ ] Medical history: birth history (term/preterm, complications), immunizations, allergies, current medications, prior diagnoses, family history, sensory sensitivities — stored as structured + free-text JSON
- [ ] `StudentService` with `isIntakeComplete()` check
- [ ] Prisma: Student, Guardian, MedicalHistory models with proper relations
- [ ] Frontend: Student intake form with all fields, guardian registration section, medical history accordion
- [ ] Integration tests: intake completeness blocks assessment start, soft delete preserves data

## Blocked by

- [03-staff-management-invite-permissions.md](./03-staff-management-invite-permissions.md)

## User stories

- #15: Staff creates student profile with Student ID (auto), OP Number (manual), full name, DOB, sex, optional photo, guardian names/relation/phone/email, address, height, weight, languages, school, preferred therapist
- #16: Staff records structured + free-text medical history
- #18: Staff registers each guardian as a user record at intake without enabling login
- #20: Clinic Admin soft-deletes student (mark `deleted_at`) for DPDP compliance

## QA checklist

- [ ] Form validates all required fields before submission
- [ ] Guardian contact info is validated (email format, phone format)
- [ ] DOB must be in the past, age calculation is correct
- [ ] Soft-deleted students are excluded from normal queries but preserved in DB
- [ ] Guardian user records have `login_enabled=false` flag
- [ ] Medical history JSON is properly validated and stored