# 006 — Guardian Consent [AFK]

**Type:** AFK  
**PRD User Stories:** 17, 20

## What to build

Before any clinical activity (assessment, treatment, sessions) can begin, all of a student's guardians must give explicit consent. Consent is captured as a typed name + checkbox + timestamp + IP address for three types: treatment, data processing, and optional image/video capture. If any guardian withdraws consent, the student's clinical activities pause until a clinic admin resolves it. This unanimous consent model is a hard gate.

## Acceptance criteria

**Schema / migrations**
- [ ] `ConsentRecord` model: `id`, `guardianId` (FK), `studentId` (FK), `type` enum (`treatment` | `data_processing` | `media_capture`), `typedName` (string), `checkedAt` (timestamp), `ipAddress` (string), `status` enum (`active` | `withdrawn`), `withdrawnAt` (nullable timestamp), `withdrawnReason` (nullable text), `createdAt`
- [ ] `Student.consentStatus` computed/denormalized field or query: `all_consented` | `partial` | `none` | `withdrawn` — updated whenever consent records change
- [ ] Index on `ConsentRecord(studentId, type, status)` for fast unanimous-check queries

**API endpoints**
- [ ] `POST /students/:id/consent` — captures consent for a guardian: `{ guardianId, type, typedName, checkedAt, ipAddress }` — validates that `guardianId` belongs to this student; idempotent (upserts if same guardian + type already has active consent)
- [ ] `GET /students/:id/consent-status` — returns per-guardian, per-type consent breakdown and overall `allConsented: boolean`
- [ ] `POST /students/:id/consent/:consentId/withdraw` — guardian or clinic_admin: marks consent as `withdrawn`, sets `withdrawnAt`, records reason; triggers student status flag
- [ ] `GET /students/:id/consent` — clinic_admin only: full consent history with timestamps and IPs
- [ ] Assessment/session creation middleware: checks `allConsented` before allowing the action; returns 422 `CONSENT_REQUIRED` if not all consented
- [ ] When any consent is withdrawn, student's active sessions and plan are flagged with `status: paused`; notification sent to assigned doctors and clinic admin

**Frontend**
- [ ] Consent capture form (embedded in the student intake wizard after guardian creation):
  - Shows each guardian with three consent checkboxes (treatment, data processing, media capture)
  - Typed name field per guardian
  - Timestamp and IP auto-captured on submit
  - Shows "All consents given" green banner when complete
- [ ] Consent status indicator on student detail page header: green lock icon (all consented), amber warning (partial), red warning (withdrawn)
- [ ] Withdrawal modal: guardian name, consent type, reason field; confirms before withdrawing
- [ ] If consent is withdrawn, banner on student detail page: "Clinical activities paused — guardian consent withdrawn. Contact clinic admin to resolve."

**Tests**
- [ ] Student with two guardians: consent is `allConsented: false` until both guardians have all three types
- [ ] Submitting consent for guardian 1 (all types) + guardian 2 (all types) → `allConsented: true`
- [ ] `POST /assessments` for a student with `allConsented: false` returns 422 `CONSENT_REQUIRED`
- [ ] Guardian withdraws treatment consent → student plan and active sessions are paused → assigned doctors receive notification
- [ ] Re-capturing consent after withdrawal restores `allConsented: true` and un-pauses plan
- [ ] `consentId` must belong to the correct student; cross-student consent modification returns 403

## QA / Manual testing

- [ ] Navigate to a student with two guardians → scroll to the Consent section in the intake wizard → enter typed names and check all boxes for guardian 1 → save → verify consent status shows "Partial"
- [ ] Complete consent for guardian 2 → verify status changes to "All Consented" (green lock icon)
- [ ] Try clicking "Start Assessment" — verify it is now unblocked
- [ ] Navigate to guardian 2's consent → click "Withdraw" for "Data Processing" → enter a reason → confirm → verify the student banner shows "Clinical activities paused"
- [ ] Re-capture guardian 2's data processing consent → verify the banner clears and "All Consented" is restored

## Blocked by

- Issue 005 — Student Intake
