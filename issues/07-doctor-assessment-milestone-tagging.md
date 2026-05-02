# 07-doctor-assessment-milestone-tagging

## What to build

Doctor assessment creation and versioning: initial assessment with chief concern (multi-select + free text), observations, findings (structured per body system + free text), notes, diagnosis, recommended baseline games. Every assessment must tag at least one leaf-level milestone. Assessments are versioned — subsequent reviews append, never overwrite.

## Acceptance criteria

- [ ] `POST /v1/students/:id/assessments` — create initial assessment (only allowed when student has no assessments)
- [ ] `POST /v1/students/:id/assessments/:id/review` — create subsequent review (appends, never overwrites)
- [ ] `GET /v1/students/:id/assessments` — list all assessments with version history
- [ ] `GET /v1/students/:id/assessments/:version` — get specific version
- [ ] Assessment fields: chief_concern (multi-select enum + free text), observations (free text), findings (structured per body system + free text), notes, diagnosis (free text), recommended_games[]
- [ ] Milestone tagging: at least one leaf-level milestone from clinic's custom framework required on every save
- [ ] `AssessmentService` with versioned append-only semantics
- [ ] `assessment_id` on Session records for traceability
- [ ] Prisma: Assessment, AssessmentVersion models
- [ ] Frontend: Assessment form with milestone tagger (searchable dropdown of leaf milestones), chief concern multi-select, body system findings accordion
- [ ] Integration tests: assessment blocks if milestone not tagged, version history preserved

## Blocked by

- [06-dpdp-consent-capture.md](./06-dpdp-consent-capture.md)

## User stories

- #22: Doctor records initial assessment with chief concern, observations, findings, notes, diagnosis, recommended baseline games
- #23: Doctor tags at least one specific (leaf-level) milestone on every assessment
- #24: Assessment records are versioned — subsequent reviews append, never overwrite
- #25: Assessments are scoped to student's assigned doctors (tenant isolation enforced via JWT)