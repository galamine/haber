# 013 — Goals as First-Class Entities [AFK]

**Type:** AFK  
**PRD User Stories:** 91, 92

## What to build

Promote treatment plan goals from JSONB fields (set in Form 1's intervention plan section) into first-class `Goal` entities attached to the treatment plan. Each goal has a horizon (short-term 4–6 weeks / long-term 3–6 months), a target attainment percentage, a current attainment percentage, and a status. Evidence-notes are appended per follow-up. When a plan is modified, each existing goal is explicitly marked continue / modify / add / discontinue, and those decisions are versioned alongside the plan version.

## Acceptance criteria

**Schema / migrations**
- [ ] `Goal` model: `id`, `treatmentPlanId` (FK), `tenantId` (FK), `description`, `horizon` enum (`short_term` | `long_term`), `targetAttainmentPct` (int 0–100), `currentAttainmentPct` (int 0–100, default 0), `status` enum (`met` | `in_progress` | `not_met`), `createdAt`, `updatedAt`
- [ ] `GoalProgressEntry` model: `id`, `goalId` (FK), `followUpId` (FK to FollowUpAssessment — nullable until issue 019), `attainmentPct` (int 0–100), `status` enum (`met` | `in_progress` | `not_met`), `evidenceNotes` (text nullable), `recordedAt` (datetime), `recordedByUserId` (FK)
- [ ] `GoalVersionDecision` model: `id`, `goalId` (FK), `newPlanVersionId` (FK to TreatmentPlan), `decision` enum (`continue` | `modify` | `add` | `discontinue`), `modifiedDescription` (text nullable — new description if decision is `modify`), `createdAt`
- [ ] Migration to extract goals from `AssessmentInterventionPlan.shortTermGoals` / `longTermGoals` JSONB into `Goal` rows when a treatment plan is created from an assessment — or leave JSONB as template and create `Goal` rows at plan activation

**API endpoints**
- [ ] `POST /treatment-plans/:planId/goals` — add a goal: `{ description, horizon, targetAttainmentPct }`; status auto-set to `in_progress`
- [ ] `GET /treatment-plans/:planId/goals` — list all goals for the plan
- [ ] `PATCH /goals/:goalId` — update description, horizon, targetAttainmentPct (draft plan only; active plan requires a modify decision)
- [ ] `POST /goals/:goalId/progress` — append a progress entry: `{ attainmentPct, status, evidenceNotes, followUpId? }`; updates `Goal.currentAttainmentPct` and `Goal.status`
- [ ] `GET /goals/:goalId/progress` — goal progress timeline (all entries, newest first)
- [ ] `POST /treatment-plans/:planId/modify-goals` — called alongside `POST /treatment-plans/:id/modify`: accepts `{ decisions: [{ goalId, decision, modifiedDescription? }] }`; validates all existing goals have a decision; creates `GoalVersionDecision` rows; goals marked `discontinue` are archived (not deleted)

**Frontend**
- [ ] Goals section in the treatment plan builder (replaces the JSONB goal templates): list of goal cards, each showing description, horizon badge, target %, current %, status chip
- [ ] "Add Goal" button: description textarea, horizon toggle (Short-term / Long-term), target attainment % slider
- [ ] When clicking "Modify Plan" (create new version): a "Goal Decisions" step is shown before the new plan is created — for each existing goal, a dropdown (Continue / Modify / Add New / Discontinue) + optional new description if "Modify"
- [ ] Goal progress timeline component: sparkline of attainment % over follow-ups with status colour coding (used in issue 022 dashboard)

**Tests**
- [ ] Adding 4 short-term goals and 4 long-term goals to a plan → all 8 `Goal` rows created
- [ ] `POST /goals/:goalId/progress` → `GoalProgressEntry` appended; `Goal.currentAttainmentPct` updated; `Goal.status` updated
- [ ] `POST /treatment-plans/:planId/modify-goals` without decisions for all goals → 422 `MISSING_GOAL_DECISIONS`
- [ ] Goal marked `discontinue` → no longer appears in active goal list but appears in history
- [ ] Goal progress is queryable independently of the plan text version
- [ ] `POST /goals/:goalId/progress` with `attainmentPct: 100` + `status: 'met'` → `Goal.status` updated to `met`

## QA / Manual testing

- [ ] Open an active treatment plan → navigate to Goals section → click "Add Goal" → enter "Child will maintain sitting balance for 10 seconds", horizon Short-term, target 80% → save
- [ ] Add a second long-term goal → verify both appear with "In Progress" status
- [ ] Click "Modify Plan" → on the "Goal Decisions" step → mark goal 1 as "Continue", goal 2 as "Modify" with new description → confirm → verify new plan version is created and goal 2 shows the updated description
- [ ] Click on a goal → click "Record Progress" → set attainment to 85%, status "Met", evidence "Child sustained sitting for 12 seconds during session 8" → save → verify the goal card shows 85% and "Met" status

## Blocked by

- Issue 011 — Treatment Plan Builder & Lifecycle
