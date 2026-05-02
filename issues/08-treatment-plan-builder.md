# 08-treatment-plan-builder

## What to build

Treatment plan builder with full lifecycle management: name, program length, optional phases, start/projected end dates, target milestones, status (draft/active/paused/completed/closed), per-game configuration with overrides, versioned modifications, game version pinning. Includes game library browser with filters.

## Acceptance criteria

- [ ] `POST /v1/students/:id/treatment-plans` — create plan (name, program_length_weeks, phases[], start_date, target_milestones[], status=draft)
- [ ] `GET /v1/students/:id/treatment-plans` — list all versions (active first)
- [ ] `GET /v1/students/:id/treatment-plans/active` — get current active plan
- [ ] `PATCH /v1/treatment-plans/:id` — modify plan (creates new versioned row, sets `is_active=false` on previous)
- [ ] `POST /v1/treatment-plans/:id/games` — add game to plan with per-game overrides: duration_seconds, repetitions, frequency_per_week, instructions, applies_to_phase
- [ ] `PATCH /v1/treatment-plans/:id/games/:gameId` — update game configuration
- [ ] `DELETE /v1/treatment-plans/:id/games/:gameId` — remove game from plan
- [ ] Plan activation: `POST /v1/treatment-plans/:id/activate` — sets status=active, creates first versioned row
- [ ] Plan lifecycle: `POST /v1/treatment-plans/:id/pause`, `POST /v1/treatment-plans/:id/resume`, `POST /v1/treatment-plans/:id/extend`, `POST /v1/treatment-plans/:id/close` (with closure_reason, outcome_summary)
- [ ] Validation: sum of game durations per session < 20 minutes (hard stop at 20, warning at 18)
- [ ] Game version pinning: each plan game assignment links to specific `game_version_id`
- [ ] Phase support: plans can have named phases (e.g., "Cycle 1: 2 weeks", "Cycle 2: 2 weeks") with games tagged to specific phases
- [ ] `TreatmentPlanService` with version increment and `is_active` swap on modify
- [ ] `GET /v1/games` — game library with filters: category, sub-category, target_issues[], difficulty, age_range_min/max
- [ ] Prisma: TreatmentPlan, TreatmentPlanVersion, PlanGameAssignment, Game, GameVersion, GameCategory models
- [ ] Frontend: Plan builder with draggable game list, duration calculator with 18-min warning and 20-min hard stop, phase timeline, version history drawer
- [ ] Integration tests: version increment on modify, duration validation, game version pinning

## Blocked by

- [07-doctor-assessment-milestone-tagging.md](./07-doctor-assessment-milestone-tagging.md)

## User stories

- #26: Doctor builds treatment plan with name, program length, optional phases, start/projected end dates, target milestones, status
- #27: Doctor adds games to plan with per-game overrides (duration, reps, frequency, instructions, phase)
- #28: System validates sum of game durations per session < 20 min (hard stop) and warns at 18 min
- #29: Plan modifications create new versioned row with `is_active` flag
- #30: Doctor pins each game to a specific `game_version`
- #31: Doctor activates, pauses, resumes, extends duration, or closes a plan
- #32: Doctor browses game library with filters (category, sub-category, target issues, difficulty, age range)

## QA checklist

- [ ] Creating a plan starts in draft mode
- [ ] Activating a plan creates `TreatmentPlanVersion` with `is_active=true`
- [ ] Modifying an active plan creates new version, old version marked `is_active=false`
- [ ] All game assignments have pinned `game_version_id`
- [ ] Duration calculator shows total session duration and warns at 18 min
- [ ] Attempting to set total duration > 20 min shows hard error
- [ ] Phase-tagged games only appear in sessions for that phase
- [ ] Closing a plan requires closure_reason and outcome_summary
- [ ] Game library filters return correct results for each filter type
- [ ] Plan timeline shows version markers with modification timestamps