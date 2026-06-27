# FE-06: Goal Tracking UI

## Context

The Haber Specialisto clinical toolkit requires therapists to view goal attainment progress per treatment plan, inspect the full history of each goal with a line chart, and see live updates after submitting follow-up assessments. BE-09 is implemented and provides `goal.list` and `goal.listProgressHistory`. FE-05's `PlanDetailPage` already exists. This issue builds the Goals tab, the `GoalDetailPage`, and the React Query invalidation wiring.

**BE-09 (Goal Tracking API) is the hard dependency.**

## Files to Create

```
apps/web/src/features/goals/
├── types.ts
├── constants.ts
├── GoalCard.tsx
├── GoalTabContent.tsx
├── GoalTimeline.tsx
└── GoalChart.tsx
apps/web/src/routes/_authenticated/children/$childId/goals/$goalId.tsx
```

## Files to Modify

```
apps/web/src/features/plan/use-plan-data.ts  — add goal.list query
apps/web/src/routes/_authenticated/children/$childId/plans/$planId/index.tsx  — add Goals tab
```

`recharts` is already installed.

---

## Implementation Details

### 1. `apps/web/src/features/plan/use-plan-data.ts`

Append a `goals` query to the hook, disabled until `planId` is available:

```typescript
const goals = useQuery(
  planId ? trpc.goal.list.queryOptions({ treatmentPlanId: planId })
    : { queryKey: ["unused"], queryFn: () => null },
  { enabled: !!planId },
);
```

### 2. `apps/web/src/routes/_authenticated/children/$childId/plans/$planId/index.tsx`

Replace the right column with a tabbed container (Overview + Goals). The parent resolves `latestNote` per goal from `goal.listProgressHistory` before passing to `GoalTabContent`.

```tsx
<Tabs defaultValue="overview">
  <TabsList className="grid w-full grid-cols-2">
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="goals">Goals</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">
    <GoalSection goals={planData.goals} />
  </TabsContent>
  <TabsContent value="goals">
    <GoalTabContent goals={goalsWithLatestNote} childId={childId} planId={planId} isLoading={goals.isLoading} />
  </TabsContent>
</Tabs>
```

`goalsWithLatestNote` is derived by fetching `goal.listProgressHistory` for each goal, taking the most recent `evidenceNotes`, and attaching it as `latestNote` on each goal object.

### 3. `apps/web/src/features/goals/types.ts`

```typescript
export type Goal = {
  id, description, horizon, targetAttainmentPct, currentAttainmentPct,
  status, supersededByGoalId, createdAt
};
export type GoalWithLatestNote = Goal & { latestNote?: string | null };
export type GoalProgressEntry = {
  id, goalId, followUpId, attainmentPct, status, evidenceNotes, recordedAt
};
```

### 4. `apps/web/src/features/goals/constants.ts`

```typescript
export const GOAL_STATUS_COLORS = { MET: "...", IN_PROGRESS: "...", NOT_MET: "...", DISCONTINUED: "..." };
export const GOAL_STATUS_LABELS = { MET: "Met", IN_PROGRESS: "In Progress", ... };
export const GOAL_HORIZON_COLORS = { SHORT_TERM: "...", LONG_TERM: "..." };
```

Full implementations use the colour values from the existing `GoalSection.tsx` (`bg-[#dcfce7] text-[#15803d]` etc.).

### 5. `apps/web/src/features/goals/GoalCard.tsx`

Per goal card. Shows description, horizon badge, status badge, progress bar (`currentAttainmentPct / targetAttainmentPct * 100`), truncated `latestNote` if provided, and a "View history" button linking to `GoalDetailPage`. Discontinued goals render with `line-through` and muted styling.

### 6. `apps/web/src/features/goals/GoalTabContent.tsx`

Two sections (Short-term / Long-term goals) filtered by `horizon` and `status !== DISCONTINUED`. Discontinued goals collapsed behind a toggle. Empty state when no goals configured. Loading state shows `Skeleton` placeholders. Each `GoalCard` receives `latestNote` from the parent.

### 7. `apps/web/src/features/goals/GoalTimeline.tsx`

Vertical timeline of `GoalProgressEntry[]`. Each entry: date, attainment %, status badge, evidence notes. Vertical line connector between entries. Empty state when no history.

### 8. `apps/web/src/features/goals/GoalChart.tsx`

Recharts `LineChart` with Y-axis domain `[0, 100]`, formatted date on X-axis, amber stroke line. Used alongside `GoalTimeline` on `GoalDetailPage`.

### 9. `apps/web/src/routes/_authenticated/children/$childId/goals/$goalId.tsx`

`GoalDetailPage`. Fetches `goal.listProgressHistory` for timeline and chart. Uses `goal.list` (disabled, client-side filtered) to resolve current goal state and superseded-by link. Renders goal header with badges, "Superseded by" alert if applicable, then a two-column grid with `GoalChart` and `GoalTimeline`. Skeleton loading states and a "Goal not found" empty state.

**Note:** A dedicated `goal.get` procedure would be cleaner but is out of BE-09 scope.

### 10. React Query invalidation after follow-up submission

In the follow-up form mutation (from FE-04), after `followUp.create` succeeds:

```typescript
trpc.goal.list.invalidate({ treatmentPlanId });
```

---

## tRPC Hooks Used

| Hook | Purpose |
|---|---|
| `trpc.goal.list.useQuery({ treatmentPlanId })` | Goals tab listing and `GoalDetailPage` workaround |
| `trpc.goal.listProgressHistory.useQuery({ goalId })` | `GoalDetailPage` timeline/chart and `latestNote` resolution |

---

## Out of Scope

- `goal.create` / `goal.updateAttainment` mutations from the UI.
- Goal attainment updates in the follow-up form — covered in FE-04; this issue only adds the invalidation.

---

## Verification

1. `pnpm check-types` — must pass across all packages.
2. `pnpm check` (Biome) — tabs/double-quotes/import order on all new and edited files.
3. Plan detail page → Goals tab → short-term/long-term split, status colours, progress bars, evidence note previews.
4. "View history" → `GoalDetailPage` renders with timeline and Recharts chart.
5. Discontinued goals hidden by default, shown after toggle.
6. `supersededByGoalId` → "Superseded by" link navigates to replacement goal.
7. After follow-up submission (FE-04), goal attainment % and evidence note update without page reload.
