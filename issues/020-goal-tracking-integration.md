# 020 — Goal Tracking Integration [AFK]

**Type:** AFK  
**PRD User Stories:** 85, 91, 92

## What to build

Wire together the `Goal`, `GoalProgressEntry`, and `FollowUpGoalReview` data into queryable longitudinal feeds: an attainment trajectory over time per goal, a rolled-up goal summary per treatment plan, and the goal lifecycle decision audit trail across plan versions. These feeds power the student dashboard (issue 022) and the recommender (issue 025).

## Acceptance criteria

**Schema / migrations**
- [ ] No new tables — this issue adds computed query endpoints and index optimisations on top of issues 013 and 019
- [ ] Add index on `GoalProgressEntry(goalId, recordedAt)` for time-series queries
- [ ] Add index on `GoalVersionDecision(goalId, newPlanVersionId)` for lifecycle audit queries

**API endpoints**
- [ ] `GET /goals/:goalId/trajectory` — time-series: `[{ date, attainmentPct, status, evidenceNotes, followUpId }]` sorted by `recordedAt` ascending — used for sparkline charts
- [ ] `GET /treatment-plans/:planId/goals-summary` — per-plan summary: `[{ goalId, description, horizon, targetAttainmentPct, currentAttainmentPct, status, latestEntryDate, trajectoryLength }]` sorted by horizon then status
- [ ] `GET /treatment-plans/:planId/goal-version-history` — full lifecycle audit: per goal, list of all `GoalVersionDecision` rows across plan versions with decision type, modified description, plan version number
- [ ] `GET /students/:id/goals-overview` — all active goals across all plan versions for the student, with current status and most recent `GoalProgressEntry`

**Frontend**
- [ ] Goal trajectory sparkline component: mini line chart of `attainmentPct` over time, colour-coded by final status (`met` = green, `in_progress` = amber, `not_met` = red); used within the goal card and the student dashboard
- [ ] Goals summary panel on the treatment plan page: sortable table of goals with progress bar for each (current / target %), horizon badge, status chip, "View Trajectory" link
- [ ] Goal version history drawer: timeline of lifecycle decisions per goal across plan versions (e.g., "v1: Added → v2: Modified → v3: Discontinued")

**Tests**
- [ ] `GET /goals/:goalId/trajectory` after 3 follow-ups → returns 3 entries in chronological order
- [ ] `GET /treatment-plans/:planId/goals-summary` returns correct `currentAttainmentPct` (matches latest `GoalProgressEntry.attainmentPct`)
- [ ] Goal marked `met` in follow-up 3 → `GET /goals/:goalId/trajectory` last entry has `status: 'met'`
- [ ] `GET /treatment-plans/:planId/goal-version-history` shows correct lifecycle decisions across plan versions
- [ ] Discontinued goal does not appear in `GET /treatment-plans/:planId/goals-summary` (active goals only)
- [ ] Tenant isolation: goals from another clinic are not visible

## QA / Manual testing

- [ ] Complete 3 follow-ups for a student, each recording different attainment percentages for the same goal (e.g., 30% → 60% → 90%) → open the goal card → verify the trajectory sparkline shows three data points rising over time
- [ ] Open the treatment plan goals summary → verify each goal shows a progress bar with correct current / target %
- [ ] Modify the plan twice (creating versions 2 and 3), changing goal decisions each time → open the "Goal Version History" drawer → verify the timeline shows "Added" at v1, your decisions at v2 and v3

## Blocked by

- Issue 013 — Goals as First-Class Entities
- Issue 019 — Follow-Up Assessment — Form 2
