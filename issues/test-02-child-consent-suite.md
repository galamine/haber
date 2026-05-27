# TEST-02: Child Intake & Consent Test Suite

## What to build

Integration tests for `ConsentService` and the child intake flow. Tests use a real test database.

**Packages:** `packages/api` (Vitest integration tests)

### Test file locations

```
packages/api/src/__tests__/consent.test.ts
packages/api/src/__tests__/child.test.ts
```

### ConsentService tests (`consent.test.ts`)

```
describe("Unanimous consent validation")
  - Recording TREATMENT consent for all guardians sets Child.consentStatus = GRANTED
  - Recording consent for one of two guardians leaves consentStatus = PENDING
  - Missing checkbox=true (validation error) is rejected at Zod level

describe("Consent withdrawal")
  - consent.withdraw sets consentStatus = WITHDRAWN
  - All future PENDING sessions for the child are marked blockedByConsent = true
  - IN_PROGRESS and COMPLETED sessions are NOT blocked
  - Attempting to create an assessment for a WITHDRAWN child returns PRECONDITION_FAILED

describe("Consent restoration")
  - consent.restore (unanimous) sets consentStatus = GRANTED
  - All PENDING sessions with blockedByConsent = true are unblocked (blockedByConsent = false)
  - Partial restoration (one guardian re-consents; other still withdrawn) leaves status = PENDING
```

### Child intake tests (`child.test.ts`)

```
describe("Intake completeness")
  - child.checkIntakeComplete returns false if guardians have no ConsentRecord
  - child.checkIntakeComplete returns true after all required fields and consent are present
  - Therapist cannot start assessment until checkIntakeComplete returns true

describe("Soft delete")
  - child.softDelete sets deletedAt; child disappears from child.list
  - ClinicAdmin can see soft-deleted child via child.listDeleted

describe("Multi-therapist assignment")
  - Assigning two therapists creates two ChildTherapistAssignment rows
  - Both therapists can access child.get
  - Unassigned therapist cannot access child.get
```

## Acceptance criteria

- [ ] All described test cases are implemented and green
- [ ] Unanimous consent logic is tested with 1-guardian and 2-guardian children
- [ ] Session blocking/unblocking on withdraw/restore is verified
- [ ] `pnpm --filter api test` passes

## Blocked by

- BE-06 (Consent management must be implemented)
