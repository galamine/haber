# BE-05: Child Intake & Guardian Registration API

## What to build

Implement child profile CRUD, guardian registration (with `loginEnabled = false`), and intake completeness validation. Staff with the `child.intake` permission can create and update child profiles.

**Packages:** `packages/api`, `packages/db`

### tRPC procedures

Add `packages/api/src/routers/child.ts`:

```
child.create       (child.intake permission) → Child
  input: { opNumber, fullName, dob, sex, photoUrl?, address?, heightCm?, weightKg?,
           weightMeasuredAt?, spokenLanguages, school?, preferredTherapistId?,
           guardians: GuardianInput[] }
  — Creates Child + Guardian records + User records for each guardian (loginEnabled=false)
  — Sets consentStatus = PENDING

child.get          (assigned therapist or clinic staff) → ChildWithGuardians

child.list         (clinic staff) → PaginatedChildren
  input: { page, pageSize, search?, therapistId?, consentStatus? }
  — Results scoped to tenantId; excludes soft-deleted unless admin

child.update       (child.intake permission) → Child
  input: { id, ...updatable fields (not consentStatus) }

child.updateMedicalHistory (child.intake permission) → Child
  input: { id, birthHistory, immunisations, allergies, currentMedications,
           priorDiagnoses, familyHistory, sensorySensitivities }
  — Stored as JSONB on Child model (add medicalHistory Json field via migration)

child.softDelete   (CLINIC_ADMIN | SUPER_ADMIN) → void
  input: { id }
  — Sets deletedAt = now(); data retained for 7 years per DPDP

child.checkIntakeComplete (protected) → { complete: boolean, missingFields: string[] }
  input: { id }
  — Returns false if required intake fields or consent are incomplete

child.assignTherapist   (clinicAdmin | child.intake) → ChildTherapistAssignment
child.unassignTherapist (clinicAdmin) → void
child.listAssignedChildren (protected) → PaginatedChildren
  — Returns children assigned to the calling therapist
```

### Shared schemas

Add:
- `CreateChildInput`, `UpdateChildInput`, `ChildSchema`, `GuardianInput`
- `ChildWithGuardiansSchema`

### Medical history extension

Add `medicalHistory Json @default("{}")` to the `Child` model via a small migration (can be bundled with BE-05 implementation).

## Acceptance criteria

- [ ] `child.create` creates Child + Guardian records; each guardian gets a User row with `loginEnabled = false`
- [ ] `child.list` returns only children belonging to the ClinicAdmin's clinic
- [ ] Assigned therapist can call `child.get`; unassigned therapist receives `FORBIDDEN`
- [ ] `child.checkIntakeComplete` returns `false` if guardians have no consent records
- [ ] `child.softDelete` sets `deletedAt`; soft-deleted child does not appear in `child.list` for non-admin users
- [ ] `child.updateMedicalHistory` persists all history fields on the child record
- [ ] Assigning a therapist creates a `ChildTherapistAssignment` record; calling `child.listAssignedChildren` returns that child for the therapist
- [ ] All queries scoped to `tenantId`; no cross-clinic access
- [ ] `pnpm check-types` passes

## Blocked by

- BE-04 (User and permission system needed for `child.intake` check)
- BE-01b (Child, Guardian, ChildTherapistAssignment models needed)
