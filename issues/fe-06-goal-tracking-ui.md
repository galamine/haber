# FE-06: Goal Tracking UI

## What to build

Build the goal tracking views: goal list per plan, attainment progress bars with history, and the follow-up review integration (attainment update during follow-up sessions).

**Package:** `packages/client`

### Routes to add

Goal tracking is embedded within plan and follow-up pages rather than having standalone routes. Add a dedicated tab on `PlanDetailPage`:

```
/dashboard/children/:id/plans/:planId → PlanDetailPage (add "Goals" tab)
/dashboard/children/:id/goals/:goalId → GoalDetailPage (standalone history view)
```

### Key components

**Goals Tab (inside PlanDetailPage):**
- Two sections: Short-term goals and Long-term goals
- Per goal card:
  - Description, horizon badge, target attainment %, status badge (colour-coded: Met=green, In Progress=amber, Not Met=red, Discontinued=muted)
  - Progress bar: current attainment % vs target
  - Latest evidence note (truncated, link to full history)
  - "View history" link → `GoalDetailPage`
- Discontinued goals collapsed by default with "Show discontinued" toggle

**GoalDetailPage:**
- Goal header: description, horizon, target %, status
- Timeline: list of `GoalProgressEntry` records ordered by `recordedAt`
  - Each entry: date, attainment %, status badge, evidence notes
  - Uses the `Recharts` `LineChart` to plot attainment % over time
- If `supersededByGoalId` is set: "Superseded by" link to the replacement goal

**Goal attainment update (inline in Follow-up Form 2 — FE-04 Section B):**
- Already covered in FE-04; this issue ensures the data flows back and the goal card updates via React Query invalidation after follow-up submission

### tRPC hooks used

- `api.goal.list.useQuery()`
- `api.goal.listProgressHistory.useQuery()`

## Acceptance criteria

- [ ] Goals Tab shows short-term and long-term goals with correct status colours
- [ ] Progress bar renders at the correct percentage (current attainment / target)
- [ ] Discontinued goals are hidden by default and shown on toggle
- [ ] `GoalDetailPage` timeline is in chronological order
- [ ] Recharts line chart renders attainment history correctly
- [ ] "Superseded by" link is shown when `supersededByGoalId` is set
- [ ] After a follow-up is submitted, goal attainment % updates without page reload (React Query invalidation)
- [ ] `pnpm --filter client typecheck` passes

## Blocked by

- BE-09 (Goal tracking API)
- FE-05 (Plan detail page is the host for the Goals tab)
