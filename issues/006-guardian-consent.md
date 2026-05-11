# 006 — Guardian Consent [AFK]

**Type:** AFK  
**PRD User Stories:** 17, 20

## What to build

Before any clinical activity (assessment, treatment, sessions) can begin, all of a student's guardians must give explicit consent. Consent is captured as a typed name + checkbox + timestamp + IP address for two types: treatment and data processing. If any guardian withdraws consent, the student's clinical activities pause until a clinic admin resolves it. This unanimous consent model is a hard gate.

## Design decisions (from grilling session)

- **Consent types**: `treatment` and `data_processing` only. `media_capture` is not required.
- **`ipAddress` and `checkedAt`**: captured server-side only (`req.ip`, `new Date()`). Not accepted in the request body.
- **`typedName`**: validated as non-empty string only. No match required against guardian's stored `fullName`.
- **`consentStatus` on Child**: denormalized enum field (`all_consented | partial | none | withdrawn`), updated by `evaluateConsentStatus()` — mirrors the existing `evaluateIntakeComplete()` pattern.
- **Withdrawal**: `clinic_admin` only. Guardian auth does not exist yet; clinic admins act on a guardian's behalf.
- **Re-capture after withdrawal**: always creates a new `ConsentRecord` row. The withdrawn row is preserved as a permanent audit trail.
- **`child.consent` right**: new right added to `clinic_admin` only in `allRoles`.
- **`requireConsent` middleware**: written but not wired to any routes. No Assessment or Session models exist yet.
- **Notifications on withdrawal**: email assigned therapists + clinic admin via existing `email.service.ts`. Session/plan pausing is a TODO (models don't exist yet).
- **Wizard placement**: consent capture is **Step 5** in the intake wizard (after Anthropometrics), not embedded in the Guardians step.

## Acceptance criteria

**Schema / migrations**
- [ ] `ConsentRecord` model: `id`, `guardianId` (FK), `childId` (FK), `type` enum (`treatment` | `data_processing`), `typedName` (string), `checkedAt` (timestamp, server-set), `ipAddress` (string, server-set), `status` enum (`active` | `withdrawn`), `withdrawnAt` (nullable timestamp), `withdrawnReason` (nullable text), `createdAt`
- [ ] `Child.consentStatus` denormalized field: `all_consented` | `partial` | `none` | `withdrawn` — updated by `evaluateConsentStatus()` whenever consent records change
- [ ] Index on `ConsentRecord(childId, type, status)` for fast unanimous-check queries

**API endpoints**
- [ ] `POST /children/:id/consent` — captures consent for a guardian: `{ guardianId, type, typedName }` — validates `guardianId` belongs to this child; idempotent (updates typedName in place if active record exists for same guardian+type; creates new row if withdrawn or none)
- [ ] `GET /children/:id/consent-status` — returns per-guardian, per-type consent breakdown and overall `allConsented: boolean`; requires auth only (no specific right)
- [ ] `POST /children/:id/consent/:consentId/withdraw` — `clinic_admin` only: marks consent as `withdrawn`, sets `withdrawnAt`, records reason; validates `consentId` belongs to this child (403 if not); triggers `evaluateConsentStatus()` and email notification
- [ ] `GET /children/:id/consent` — `clinic_admin` only: full consent history with timestamps and IPs
- [ ] `requireConsent` middleware: written in `middlewares/requireConsent.ts`, returns 422 `CONSENT_REQUIRED` if `consentStatus !== all_consented`; **not wired to any routes yet** (no Assessment/Session models exist)
- [ ] On withdrawal: email sent to assigned therapists and clinic admin users; `// TODO: pause active sessions and plan when those models exist`

**Shared package**
- [ ] `child.consent` right added to `clinic_admin` in `packages/shared/src/constants/roles.ts`
- [ ] `CaptureConsentDto`, `WithdrawConsentDto`, `ConsentStatusDto`, `ConsentRecordDto` schemas and types in shared package

**Frontend**
- [ ] Step 5 "Consent" added to intake wizard (`ChildCreatePage.tsx`) after Anthropometrics:
  - Shows each guardian with two consent checkboxes (treatment, data processing)
  - Typed name field per guardian (non-empty required before submitting that guardian's consent)
  - Finish button only enabled when `allConsented: true`; skipping Step 5 is allowed with a warning
  - Shows "All consents given" green banner when complete
- [ ] Consent status indicator in child detail page header: green lock icon (`all_consented`), amber warning (`partial` or `none`), red warning (`withdrawn`)
- [ ] Withdrawal banner on child detail page when `consentStatus === 'withdrawn'`: "Clinical activities paused — guardian consent withdrawn. Contact clinic admin to resolve."
- [ ] Withdrawal modal (`WithdrawConsentModal.tsx`): guardian name, consent type, required reason field; confirm before withdrawing; `clinic_admin` only
- [ ] Consent history section on child detail page (clinic_admin only): table of records with guardian name, type, status, timestamps; "Withdraw" button per active record

**Tests**
- [ ] Child with two guardians: consent is `allConsented: false` until both guardians have both types
- [ ] Guardian 1 (both types) + guardian 2 (both types) → `allConsented: true`
- [ ] `requireConsent` middleware returns 422 `CONSENT_REQUIRED` when `consentStatus !== all_consented`
- [ ] Guardian withdraws treatment consent → `consentStatus: withdrawn` → assigned therapists receive email notification
- [ ] Re-capturing consent after withdrawal creates a new ConsentRecord row and restores `allConsented: true`
- [ ] `consentId` belonging to a different child returns 403

## QA / Manual testing

- [ ] Create child with two guardians → navigate to Step 5 (Consent) → enter typed name and check both boxes for guardian 1 only → submit → verify consent status shows amber warning icon on detail page
- [ ] Complete consent for guardian 2 → verify status changes to green lock icon ("All Consented")
- [ ] Try clicking "Finish" on Step 5 — verify it is only enabled after all consents are submitted
- [ ] On child detail page (as clinic_admin): find guardian 2's treatment consent → click "Withdraw" → enter a reason → confirm → verify red warning icon and paused banner appear
- [ ] Re-capture guardian 2's treatment consent via Step 5 → verify banner clears and green lock returns

## Blocked by

- Issue 005 — Student Intake
