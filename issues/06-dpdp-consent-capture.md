# 06-dpdp-consent-capture

## What to build

Guardian consent workflow: capture typed name + checkbox + timestamp + IP for treatment, data processing, and optional image/video. Unanimous consent model — all guardians must have valid active consent or student is blocked from treatment. Consent withdrawal handling.

## Acceptance criteria

- [ ] `POST /v1/students/:id/consent` — capture consent: typed guardian name, checkboxes for treatment/data-processing/image-video, timestamp, IP address
- [ ] `GET /v1/students/:id/consent` — list all consent records for student
- [ ] `ConsentService.validateUnanimousConsent(studentId)` — returns true only if ALL guardians have active (non-expired, non-withdrawn) consent
- [ ] Consent record: links to guardian, consent type, expiry date (if applicable), withdrawal timestamp
- [ ] `POST /v1/guardians/:id/withdraw-consent` — withdraw consent, flags student as `consent_withdrawn=true`, pauses active treatment plans
- [ ] Student cannot proceed to assessment or session if consent is not unanimous
- [ ] Prisma: ConsentRecord model with consent type enum, withdrawal tracking
- [ ] Frontend: Consent capture form during intake, consent status indicator on student profile
- [ ] Integration tests: unanimous consent validation, withdrawal triggers plan pause

## Blocked by

- [05-student-intake-guardian-registration.md](./05-student-intake-guardian-registration.md)

## User stories

- #17: Staff captures guardian consent (typed name + checkbox + timestamp + IP) for treatment, data processing, and optional image/video capture
- #19: Doctor blocked from starting assessment unless all required intake fields and consent are complete

## QA checklist

- [ ] Consent form captures all three consent types separately
- [ ] Typed name must match guardian's stored name (forensic validity)
- [ ] IP address recorded for each consent event
- [ ] Withdrawal immediately pauses active treatment plans
- [ ] Re-consent after withdrawal unpauses treatment plans
- [ ] Student profile shows consent status (complete/incomplete/withdrawn)