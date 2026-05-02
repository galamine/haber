# 09-session-generation-queue

## What to build

Session pre-computation engine: batch-generates Session records and SessionGameAssignment records from active plans (nightly cron or on-plan-activation). Produces a daily queue of pre-linked game assignments.

## Acceptance criteria

- [ ] `POST /v1/sessions/generate` — trigger session generation (admin-only, also callable by cron)
- [ ] SessionGenerator: for each student with `status=active` plan, generates sessions per the plan's frequency_per_week (e.g., 3x/week = generate 3 sessions for next 7 days)
- [ ] SessionGameAssignment: pre-links game_id, version, level, duration, reps, instructions, scoring_rubric_version to each session
- [ ] Pre-computed sessions stored with `status=scheduled`, `scheduled_date`, `room_id` (optional booking)
- [ ] Room conflict detection: if room already booked, mark session as `room_conflict=true`
- [ ] `SessionGenerator` can be triggered on plan activation (to immediately generate sessions for newly activated plan)
- [ ] Nightly cron job (00:00 IST) calls session generation
- [ ] Prisma: Session, SessionGameAssignment models
- [ ] Integration tests: given active plan with frequency, verify correct number and timing of sessions generated

## Blocked by

- [08-treatment-plan-builder.md](./08-treatment-plan-builder.md)

## User stories

- #33: Sessions pre-computed (batch-generated nightly or on-plan-activation) for each student with active plan
- #78 (from Session Execution): sessions pre-linked with game assignments, room, student summary

## QA checklist

- [ ] Sessions are generated for the correct number of times per week based on plan frequency
- [ ] Sessions fall on valid days (no past dates)
- [ ] Game assignments are correctly linked from plan games
- [ ] Room conflicts are detected and flagged
- [ ] Cron trigger works at scheduled time
- [ ] On-plan-activation generates sessions immediately
- [ ] Re-running generation does not duplicate sessions for same date