# 011 — Treatment Plan Builder & Lifecycle [AFK]

**Type:** AFK  
**PRD User Stories:** 26–31

## What to build

Doctors build a structured treatment plan for a student: name, program length, optional phases, start/end dates, target milestones, per-game assignments with detailed overrides, and a session duration cap. Every modification creates a new versioned row with `is_active` flag; history is preserved. The plan lifecycle (draft → active → paused → completed → closed) is enforced through explicit status transitions.

## Acceptance criteria

**Schema / migrations**
- [ ] `TreatmentPlan` model: `id`, `studentId` (FK), `tenantId` (FK), `name`, `programLengthWeeks` (int), `phases` (JSONB array of `{ label, durationWeeks }`, nullable), `startDate` (date), `projectedEndDate` (date), `sessionDurationMinutes` (int, default 60), `status` enum (`draft` | `active` | `paused` | `completed` | `closed`), `is_active` (boolean), `version` (int), `previousVersionId` (nullable self-FK), `targetMilestoneIds` (JSONB array), `closureReason` (text nullable), `closureOutcomeSummary` (text nullable), `sourcePresetId` (nullable string — records which preset was cloned, if any), `createdByUserId` (FK), `createdAt`, `updatedAt`
- [ ] `TreatmentPlanGame` model: `id`, `treatmentPlanId` (FK), `gameId` (FK to Game), `gameVersionId` (FK to GameVersion — pinned), `durationSeconds` (int), `repetitions` (int), `frequencyPerWeek` (int), `instructions` (text nullable), `appliesToPhase` (int nullable — phase index), `createdAt`
- [ ] Only one `TreatmentPlan` row per student may have `is_active: true` at any time (partial unique index)
- [ ] `Student.latestPlanId` updated on each plan activation

**API endpoints**
- [ ] `POST /treatment-plans` — doctor only (must be assigned to student): creates a draft plan; returns `{ id, version: 1, status: 'draft', is_active: false }`
- [ ] `GET /treatment-plans?studentId=:id` — list all versions (history) for a student, newest first
- [ ] `GET /treatment-plans/:id` — plan detail with game assignments
- [ ] `PATCH /treatment-plans/:id` — update draft plan fields (name, dates, session duration, phases, target milestones); draft-only
- [ ] `POST /treatment-plans/:id/games` — add a game to the plan with overrides; validates that the sum of all game `durationSeconds` does not exceed `sessionDurationMinutes * 60`; returns 422 `SESSION_CAP_EXCEEDED` if over; returns warning if sum > 90% of cap
- [ ] `PATCH /treatment-plans/:id/games/:gameId` — update per-game overrides
- [ ] `DELETE /treatment-plans/:id/games/:gameId` — remove a game from the plan
- [ ] `POST /treatment-plans/:id/activate` — transitions `draft` → `active`; sets `is_active: true`, deactivates previous active plan
- [ ] `POST /treatment-plans/:id/pause` — `active` → `paused`
- [ ] `POST /treatment-plans/:id/resume` — `paused` → `active`
- [ ] `POST /treatment-plans/:id/modify` — creates a new versioned copy of the current active plan with `is_active: true` (old version becomes `is_active: false`); returns the new plan id
- [ ] `POST /treatment-plans/:id/close` — `active` | `paused` → `closed`; requires `{ closureReason, closureOutcomeSummary }`
- [ ] `POST /treatment-plans/:id/complete` — `active` → `completed`

**Frontend**
- [ ] "Create Treatment Plan" button on student Treatment Plan tab
- [ ] Plan builder page:
  - Header section: plan name, program length, phases editor, start/end dates, session duration input, target milestones multi-select
  - Game assignment section: searchable game picker (filtered to clinic-enabled games from issue 014), per-game override form (duration, reps, frequency, instructions, phase)
  - Session duration gauge: shows current sum / cap with 90% warning colour
- [ ] Plan history sidebar: version list with status badges and modification dates
- [ ] Lifecycle action buttons: "Activate", "Pause", "Resume", "Modify" (creates new version), "Close", "Complete" — visible based on current status
- [ ] "Modify Plan" creates a new version and redirects to edit the new version (old version shown as read-only in history)

**Tests**
- [ ] Creating a plan → `version: 1`, `is_active: false`
- [ ] Activating a plan → `is_active: true`; previous active plan becomes `is_active: false`
- [ ] Adding games whose total duration exceeds `sessionDurationMinutes * 60` → 422 `SESSION_CAP_EXCEEDED`
- [ ] Adding games totalling 91% of cap → 200 with `{ warning: 'SESSION_CAP_SOFT_WARNING', utilizationPct: 91 }`
- [ ] `POST /treatment-plans/:id/modify` → new plan with `version: n+1`, `is_active: true`; old plan `is_active: false`
- [ ] `POST /treatment-plans/:id/close` without body → 422 validation error
- [ ] Game pinned to `gameVersionId` at plan creation time — subsequent game version updates do not change the plan's pinned version

## QA / Manual testing

- [ ] Log in as doctor → open a student with a finalised assessment → click "Create Treatment Plan" → fill in name, 8 weeks, 2 phases, start date
- [ ] Add game "Balance Beam" with 10 min duration, 3 reps, 3x/week → add "Sensory Swing" 15 min → verify the duration gauge shows 25/60 min (42%)
- [ ] Keep adding games until you exceed 60 min → verify the 90% warning appears yellow, then 100% triggers a red error toast
- [ ] Click "Activate" → verify plan status becomes "Active" in the header
- [ ] Click "Modify Plan" → verify a new version 2 is created and you are editing it; version 1 shows as "Superseded" in history
- [ ] Click "Close" → enter closure reason → verify status becomes "Closed" and the plan is locked

## Blocked by

- Issue 010 — Form 1: Tools, Goals, Intervention Plan & Signatures
