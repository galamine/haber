# 022 — Student Progress Dashboard [AFK]

**Type:** AFK  
**PRD User Stories:** 53

## What to build

Build the per-student longitudinal dashboard: a comprehensive view for doctors and therapists that shows the full clinical picture in one place. Includes snapshot card, milestone radar/spider chart over time, per-game score line charts, session calendar with attendance, notes timeline, plan timeline with version markers, and a goal progress panel. All charts render from structured JSON APIs (no client-side aggregation beyond chart rendering).

## Acceptance criteria

**Schema / migrations**
- [ ] No new tables — this issue adds read-optimised query endpoints on top of existing data

**API endpoints**
- [ ] `GET /students/:id/dashboard` — returns a structured JSON payload covering:
  - `snapshot`: `{ name, dob, age, opNumber, activePlan: { name, status, version, sessionDurationMinutes, nextSessionDate }, attendancePct (last 30 days), totalSessions, completedSessions }`
  - `milestoneRadar`: array of `{ milestoneId, name, ratings: [{ date, achievedAtAgeMonths, delayed }] }` — one entry per assessment version
  - `sensoryRadar`: array of `{ sensorySystemId, name, baseline: { rating, date }, latestFollowUp: { rating, date, delta } }` — shows baseline vs. most recent follow-up for all 7 systems
  - `gameScoreTrends`: per-game array of `{ gameId, gameName, scores: [{ sessionDate, score, partial }] }` — last 20 sessions per game
  - `goalsOverview`: from `GET /students/:id/goals-overview` (issue 020)
  - `planTimeline`: array of `{ version, status, createdAt, gameCount, modificationReason? }` — plan version markers
  - `notesTimeline`: array of `{ date, source: 'assessment' | 'session' | 'followup', note, authorName }` — merged timeline of therapist notes and observations
- [ ] `GET /students/:id/session-calendar` — `[{ sessionId, scheduledDate, status, attendanceStatus, gameTitles[], roomName }]` — used to render the calendar view

**Frontend**
- [ ] Student detail page gains a **Dashboard** tab as the default tab
- [ ] Dashboard layout:
  - Top row: snapshot card (name, age, OP, plan status, next session date, attendance %)
  - Row 2: milestone radar chart (spider chart, two overlaid polygons: latest assessment vs. prior version) | sensory radar chart (current vs. baseline for 7 systems, delta displayed as colour)
  - Row 3: per-game score line chart (one line per game, last 20 sessions, partial results shown as open circles)
  - Row 4: session calendar (month view, colour-coded by attendance status)
  - Row 5: plan timeline (horizontal timeline with version markers and status badges)
  - Row 6: notes timeline (chronological feed of assessment observations, session notes, follow-up observations)
- [ ] Goal progress panel (from issue 020 trajectory sparklines): collapsible section between rows 2 and 3
- [ ] All charts use Recharts (already in frontend dependencies)

**Tests**
- [ ] `GET /students/:id/dashboard` returns all required keys in the payload
- [ ] `gameScoreTrends` returns at most 20 sessions per game (sorted by date ascending)
- [ ] `sensoryRadar` correctly computes `delta = latestFollowUp.rating - baseline.rating`
- [ ] `attendancePct` is computed only from `completed` sessions in the last 30 days
- [ ] `notesTimeline` merges sources in chronological order (not grouped by source type)
- [ ] Accessing another clinic's student dashboard returns 403 (tenant isolation)

## QA / Manual testing

- [ ] Log in as doctor → open a student with at least 5 completed sessions, a finalised Form 1, and one follow-up → navigate to the Dashboard tab
- [ ] Verify the snapshot card shows correct name, age, plan name, and attendance %
- [ ] Verify the milestone radar chart shows two overlaid polygons (initial assessment vs. latest)
- [ ] Verify the sensory radar shows all 7 systems with delta badges (e.g., "+1" in green for improvement)
- [ ] Verify the per-game score chart shows a line for each game with the last sessions plotted
- [ ] Click on a session in the session calendar → verify it navigates to the session detail page
- [ ] Verify the notes timeline shows entries from the assessment, sessions, and follow-up in correct date order

## Blocked by

- Issue 010 — Form 1: Tools, Goals, Intervention Plan & Signatures
- Issue 011 — Treatment Plan Builder & Lifecycle
- Issue 015 — Session Generation & Queue
- Issue 020 — Goal Tracking Integration
