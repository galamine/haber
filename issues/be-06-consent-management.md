# BE-06: Consent Management API (DPDP)

## What to build

Implement guardian consent capture, unanimous consent validation, withdrawal handling, and automatic session blocking/unblocking. Consent is a hard gate: no assessment can start without it.

**Packages:** `packages/api`, `packages/shared`

### tRPC procedures

Add `packages/api/src/router/consent.ts`:

```
consent.record     (child.intake permission) → ConsentRecord
  input: { childId, guardianId, consentType, typedName, checkbox: true, ip }
  — Creates ConsentRecord; after saving, checks unanimous consent and updates Child.consentStatus

consent.getStatus  (assigned therapist or clinic staff) → { status: ConsentStatus, guardians: GuardianConsentSummary[] }
  input: { childId }
  — Returns per-guardian consent status for all three consentTypes

consent.withdraw   (CLINIC_ADMIN | SUPER_ADMIN) → void
  input: { childId, guardianId, reason? }
  — Sets Child.consentStatus = WITHDRAWN
  — Marks all future PENDING TherapySessions for this child as blockedByConsent = true

consent.restore    (CLINIC_ADMIN | SUPER_ADMIN) → void
  input: { childId, guardianId }
  — Re-records consent; if unanimous again, sets Child.consentStatus = GRANTED
  — Unblocks sessions (blockedByConsent = false) for all PENDING sessions
```

### Unanimous consent logic

After any `consent.record` or `consent.restore`:
1. Check that ALL guardians of the child have a `ConsentRecord` with `consentType = TREATMENT` and `checkbox = true`
2. If yes → set `Child.consentStatus = GRANTED`
3. If any guardian is missing → leave as `PENDING`

The `treatment_plan.start` and `assessment.create` procedures (implemented in later issues) must call this check and throw `PRECONDITION_FAILED` if `consentStatus !== GRANTED`.

### DPDP notes

- `ConsentRecord` rows are immutable (never updated, only new rows created for each re-consent)
- Withdrawal does not delete consent records — it adds a `withdrawn` status indicator on the child
- IP address is captured from the tRPC request context (add `ip: string` to `TrpcContext`)

### Shared schemas

Add:
- `RecordConsentInput`, `ConsentRecordSchema`, `ConsentStatusSummarySchema`

## Acceptance criteria

- [ ] Recording TREATMENT consent for all guardians sets `Child.consentStatus = GRANTED`
- [ ] Recording consent for only one of two guardians leaves `consentStatus = PENDING`
- [ ] `consent.withdraw` sets `consentStatus = WITHDRAWN` and marks all future PENDING sessions `blockedByConsent = true`
- [ ] `consent.restore` (unanimous) sets `consentStatus = GRANTED` and unblocks PENDING sessions
- [ ] `consent.getStatus` returns per-guardian breakdown across all three consent types
- [ ] Therapist cannot call `consent.withdraw` — receives `FORBIDDEN`
- [ ] IP address is captured in `ConsentRecord` from request context
- [ ] Attempting to create an assessment for a child with `consentStatus !== GRANTED` returns `PRECONDITION_FAILED` (tested in BE-07)
- [ ] `pnpm typecheck` passes

## Blocked by

- BE-05 (Child and Guardian records must exist)
