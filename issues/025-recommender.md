# 025 — Rule-Based Recommender [AFK]

**Type:** AFK  
**PRD User Stories:** 58–61

## What to build

A rule-based recommender that suggests changes to a student's treatment plan (add/remove/adjust game frequency) during periodic plan reviews. Rules are authored in a structured DSL by Clinic Admins or clinical advisors. Doctors review recommendations and accept, modify, or reject each one. Every recommendation, doctor decision, and override is logged for auditability. Recommendations are transparent — each one cites the rule that triggered it.

## Acceptance criteria

**Schema / migrations**
- [ ] `RecommenderRule` model: `id`, `tenantId` (FK nullable — null for global rules), `name`, `description`, `dsl` (JSONB — structured rule: `{ condition: { metric, aggregation, windowSessions, category, operator, threshold }, action: { type: 'add' | 'remove' | 'adjust_frequency', category?, difficulty?, newFrequency? } }`), `isActive` (boolean), `createdByUserId` (FK), `createdAt`, `updatedAt`
- [ ] `Recommendation` model: `id`, `studentId` (FK), `treatmentPlanId` (FK), `triggeredByRuleId` (FK to RecommenderRule), `type` enum (`add_game` | `remove_game` | `adjust_frequency`), `gameId` (FK nullable), `gameCategoryId` (FK nullable), `difficulty` (nullable), `newFrequency` (int nullable), `ruleCitation` (text — human-readable explanation of why the rule fired), `status` enum (`pending` | `accepted` | `modified` | `rejected`), `doctorDecisionAt` (timestamp nullable), `doctorDecisionByUserId` (FK nullable), `doctorNotes` (text nullable), `createdAt`
- [ ] `RecommendationAuditLog` model: `id`, `recommendationId` (FK), `action` enum (`generated` | `accepted` | `modified` | `rejected`), `actorUserId` (FK), `timestamp`, `notes` (text nullable)

**API endpoints**
- [ ] `POST /recommender/rules` — clinic_admin only: create a rule with DSL; validates DSL schema
- [ ] `GET /recommender/rules` — clinic_admin only: list active rules for the clinic (global + tenant-specific)
- [ ] `PATCH /recommender/rules/:id` — clinic_admin only: update rule DSL or activate/deactivate
- [ ] `POST /recommender/run/:studentId` — doctor only: run the recommender for a student against their active plan and the last N sessions; returns new `Recommendation` rows created (skips rules already generating a pending recommendation for the same student); each recommendation includes `ruleCitation`
- [ ] `GET /recommendations?studentId=:id&status=pending` — doctor: list pending recommendations for a student
- [ ] `POST /recommendations/:id/accept` — doctor: sets `status: accepted`; creates `RecommendationAuditLog` entry; the plan is NOT automatically modified — the doctor applies changes manually to the plan
- [ ] `POST /recommendations/:id/modify` — doctor: accepts with modifications: `{ notes, modifications }` — sets `status: modified`; logs audit entry
- [ ] `POST /recommendations/:id/reject` — doctor: `{ notes }` — sets `status: rejected`; logs audit entry

**Backend recommender engine**
- [ ] `RecommenderService.evaluate(studentId)`: for each active rule, evaluates the DSL condition against `GameResult` aggregates; if condition is met and no pending recommendation exists for this rule+student combination, creates a `Recommendation` with a natural-language `ruleCitation`
- [ ] Example DSL evaluation: `IF avg(score, last 3 sessions, category='Balance') < 40 THEN recommend ADD games from category='Balance' with difficulty='easy'`
- [ ] Rule evaluation is synchronous (not queued) for V1

**Frontend**
- [ ] "Run Recommendations" button on the treatment plan page (doctor only); triggers `POST /recommender/run/:studentId`
- [ ] Recommendations panel: list of pending recommendation cards, each showing: recommendation type, target game/category, rule citation (e.g. "Average Balance score was 32% over the last 3 sessions (rule: 'Low Balance Score Trigger')"), accept / modify / reject action buttons
- [ ] "Accept" → green confirmation; "Reject" → dismisses card with a note input; "Modify" → opens a notes textarea + custom modification input
- [ ] Rule authoring page (clinic_admin): form to create/edit rules with a structured DSL builder (dropdowns for metric, aggregation, window, category, operator, threshold, action type)
- [ ] Audit log view: per-student recommendation history with decision trail

**Tests**
- [ ] Rule with condition `avg(score, last 3, category='Balance') < 40` fires when the student's last 3 balance game scores average below 40
- [ ] Same rule does not fire a second time if a pending recommendation already exists for this rule+student
- [ ] `POST /recommendations/:id/accept` creates an audit log entry with `action: 'accepted'` and `actorUserId`
- [ ] `POST /recommendations/:id/reject` without notes still succeeds; `notes` is optional
- [ ] Doctor from another clinic cannot accept/reject recommendations for this clinic's students (403)
- [ ] DSL validation: creating a rule with an invalid metric name returns 422

## QA / Manual testing

- [ ] Log in as clinic_admin → navigate to Recommender Rules → click "New Rule" → set condition: metric "avg score", category "Balance", window "last 3 sessions", operator "<", threshold 40 → action "Add game", category "Balance", difficulty "Easy" → save
- [ ] Log in as doctor → open a student whose last 3 balance game sessions average below 40 → click "Run Recommendations"
- [ ] Verify a recommendation card appears: "Add Balance game (Easy) — Average Balance score was 32% over the last 3 sessions (rule: 'Balance Score Trigger')"
- [ ] Click "Accept" → verify status changes to "Accepted" and an audit entry is logged
- [ ] Click "Run Recommendations" again → verify no duplicate recommendation is generated (already accepted)
- [ ] Open the recommendation audit log → verify the "generated" and "accepted" events appear with timestamps and actor names

## Blocked by

- Issue 020 — Goal Tracking Integration
- Issue 021 — Notifications & Alerts
