# FE-09 : Per-Child Dashboard & Progress UI

## Context

Build the per-child longitudinal dashboard: snapshot card, milestone radar chart,
sensory system trend charts, per-game score trend lines, session calendar, notes
timeline, and plan timeline. Frontend only (`apps/web`).

BE-14 is **already implemented** — all 6 dashboard tRPC endpoints exist in
`packages/api/src/routers/dashboard.ts` with schemas in `packages/api/src/schemas/dashboard.ts`.
Recharts is installed, the shadcn `ChartContainer`/`ChartTooltip` wrapper exists in
`packages/ui/src/components/chart.tsx`, and chart CSS variables (`--chart-1` through
`--chart-5`) are defined in `packages/ui/src/styles/globals.css`.

Key facts derived from the codebase:
- **Existing Recharts pattern** at `apps/web/src/features/goals/GoalChart.tsx` uses
  Recharts directly (`LineChart`, `Line`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer`).
- **Dashboard endpoints** return: `childSnapshot` (name/age/OP/plan/nextSession/attendancePct),
  `milestoneRadar` (versionNumber/recordedAt/milestones[]), `sensoryDeltaHistory`
  (systemId/dataPoints[]), `gameScoreTrends` (date/gameId/gameName/score/rawMetrics),
  `sessionCalendar` (Record<dateKey, sessions[]>), `notesTimeline` (date/source/section/content).
- **`plan.list`** returns all plan versions for a child (for plan timeline).
- **Sensory systems** = 7 lines, but only 5 chart colours exist — need `--chart-6`/`--chart-7`.
- **No calendar widget** exists in `packages/ui` — will install shadcn `Calendar` component
  (wraps `react-day-picker` + `date-fns`).
- **ChildProfilePage** at `_authenticated/children/$childId/index.tsx` has a tabbed layout
  with placeholder tabs for "Assessments" and "Sessions".

## Decisions

| Question | Decision |
|---|---|
| Direct Recharts or shadcn ChartContainer? | Direct Recharts — matches existing `GoalChart.tsx` pattern. |
| Calendar component? | shadcn `Calendar` (wraps `react-day-picker` + `date-fns`) — install via `npx shadcn@latest add calendar -c packages/ui`. |
| How to add dashboard to ChildProfilePage? | New "Dashboard" tab with `<Link>` to the dedicated route. |
| Sensory chart colours beyond 5? | Add `--chart-6` and `--chart-7` to `globals.css`. |

## Files to Create

| File | Purpose |
|---|---|
| `apps/web/src/routes/_authenticated/children/$childId/dashboard.tsx` | Route page — responsive grid layout, all tRPC queries, calendar month state |
| `apps/web/src/features/child-dashboard/SnapshotCard.tsx` | Photo, name, age, OP, active plan, next session, attendance % |
| `apps/web/src/features/child-dashboard/MilestoneRadarChart.tsx` | Recharts `RadarChart` — one axis per milestone, one series per assessment version |
| `apps/web/src/features/child-dashboard/SensoryTrendChart.tsx` | Recharts `LineChart` — one line per sensory system, togglable via legend |
| `apps/web/src/features/child-dashboard/GameScoreTrendChart.tsx` | Recharts `LineChart` — one chart per game, score over time |
| `apps/web/src/features/child-dashboard/SessionCalendar.tsx` | shadcn `Calendar` in a `<Card>` — day cells coloured by session status, popover on click |
| `apps/web/src/features/child-dashboard/NotesTimeline.tsx` | Vertical timeline — date, type badge, excerpt + expand |
| `apps/web/src/features/child-dashboard/PlanTimeline.tsx` | Horizontal timeline — plan version markers |

## Files to Modify

| File | Change |
|---|---|
| `packages/ui/package.json` | Add `react-day-picker` and `date-fns` dependencies |
| `packages/ui/src/components/calendar.tsx` | New — installed via `npx shadcn@latest add calendar -c packages/ui` |
| `packages/ui/src/styles/globals.css` | Add `--chart-6` and `--chart-7` CSS variables for sensory system colours |
| `apps/web/src/routes/_authenticated/children/$childId/index.tsx` | Add `<Link>` to dashboard route inside Overview tab content |

## Step 1 — Install shadcn Calendar component

Install `react-day-picker` and `date-fns` as dependencies of the UI package, then add
the shadcn `Calendar` component:

```bash
pnpm add react-day-picker date-fns --filter @haber-final/ui
npx shadcn@latest add calendar -c packages/ui
```

This creates `packages/ui/src/components/calendar.tsx` and is automatically exported
via the wildcard in `packages/ui/package.json`.

## Step 2 — Add chart colours to `globals.css`

Add two more chart CSS variables for the 7 sensory systems. Insert after the existing
`--chart-5` definition:

```css
--chart-6: #8b5cf6;  /* Violet */
--chart-7: #ec4899;  /* Pink */
```

Also add the corresponding `@theme inline` mappings:

```css
--color-chart-6: var(--chart-6);
--color-chart-7: var(--chart-7);
```

## Step 3 — Create `SnapshotCard.tsx`

Props receive the `childSnapshot` response. Use existing `<Card>`, `<Avatar>`,
`<Badge>` components. Layout: avatar + name/age/OP on left, plan info + next session
+ attendance % on right.

```tsx
// Essential layout pattern
<Card className="p-5">
  <div className="flex items-start justify-between">
    <div className="flex items-center gap-4">
      <Avatar className="h-14 w-14">
        {photoUrl && <AvatarImage src={photoUrl} alt={name} />}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div>
        <h2 className="font-semibold text-lg">{name}</h2>
        <p className="text-sm text-on-surface-variant">{age} yrs · {opNumber}</p>
      </div>
    </div>
    <div className="text-right">
      <p className="text-sm font-medium">{activePlan?.name ?? "No active plan"}</p>
      <p className="text-xs text-on-surface-variant">Attendance: {attendancePct.toFixed(0)}%</p>
    </div>
  </div>
</Card>
```

## Step 4 — Create `MilestoneRadarChart.tsx`

Use Recharts `RadarChart` directly (same import pattern as `GoalChart.tsx`). One axis
per milestoneId, one `Radar` per assessment version, colours from chart palette.

```tsx
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
         ResponsiveContainer, Tooltip, Legend } from "recharts";

// Transform: for each milestone, create { milestone, [v1]: attained, [v2]: attained }
// Render one <Radar> per versionNumber with different stroke/fill colours
```

Empty state: "No milestone data to display." matching GoalChart pattern.

## Step 5 — Create `SensoryTrendChart.tsx`

Recharts `LineChart` with one `Line` per systemId. Use `useState<Record<string, boolean>>`
to toggle system visibility via legend checkboxes. X: dates, Y: 1–5 rating.

```tsx
// State for toggling systems
const [visible, setVisible] = useState<Record<string, boolean>>(
  () => Object.fromEntries(data.map((d) => [d.systemId, true]))
);

// One <Line> per system, hidden when !visible[systemId]
{data.map((system, i) => (
  <Line key={system.systemId} dataKey={system.systemId}
    hide={!visible[system.systemId]}
    stroke={`var(--chart-${(i % 7) + 1})`} strokeWidth={2} />
))}
```

## Step 6 — Create `GameScoreTrendChart.tsx`

Group `gameScoreTrends` data by `gameId`. Render one `LineChart` per group with
`gameName` as the chart title. Tooltip shows score + `rubric_version` from `rawMetrics`.

```tsx
const grouped = useMemo(() => {
  const map = new Map<string, GameScoreEntry[]>();
  for (const entry of data) {
    if (!map.has(entry.gameId)) map.set(entry.gameId, []);
    map.get(entry.gameId)!.push(entry);
  }
  return Array.from(map.entries());
}, [data]);
```

## Step 7 — Create `SessionCalendar.tsx`

Use shadcn `Calendar` component (from `@haber-final/ui/components/calendar`) inside a
`<Card>`. The Calendar handles month grid, navigation, and day cell rendering. Props:
`data` (Record<dateKey, sessions[]>), `month`, `year`, `onMonthChange`.

Overlay session status colours on day cells using CSS classes. The Calendar's
`modifiers` prop or a custom `day` render function can apply background colours per
session status.

```tsx
// Status colour mapping
const STATUS_COLOUR: Record<string, string> = {
  PENDING: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  ABSENT: "bg-red-100 text-red-800",
  MANUALLY_CLOSED: "bg-gray-100 text-gray-800",
};
```

Day click opens `<Popover>` from `@haber-final/ui/components/popover` listing
session summaries. The Calendar's built-in month navigation replaces custom
prev/next buttons.

## Step 8 — Create `NotesTimeline.tsx`

Reverse the backend-sorted array (newest first). Vertical line layout with date,
type `<Badge>` (Session/Assessment/Follow-up), note excerpt (~150 chars) + expand
toggle via `useState`.

```tsx
const SOURCE_BADGE: Record<string, string> = {
  session: "bg-blue-100 text-blue-700",
  assessment: "bg-amber-100 text-amber-700",
  followUp: "bg-purple-100 text-purple-700",
};
```

## Step 9 — Create `PlanTimeline.tsx`

Horizontal flex row of plan versions. Each node: circle marker + plan name + version
number + date. Active plan highlighted in `--chart-1` brown, inactive in muted grey.

```tsx
<div className="flex items-center gap-4 overflow-x-auto py-4">
  {plans.map((plan) => (
    <div key={plan.id} className="flex flex-col items-center min-w-[120px]">
      <div className={`h-3 w-3 rounded-full ${plan.isActive ? "bg-chart-1" : "bg-gray-300"}`} />
      <p className="mt-2 text-xs font-medium">{plan.name}</p>
      <p className="text-xs text-on-surface-variant">v{plan.versionNumber}</p>
    </div>
  ))}
</div>
```

## Step 10 — Create `dashboard.tsx` route page

`createFileRoute("/_authenticated/children/$childId/dashboard")`. Extract `childId`,
call all 6 dashboard queries + `plan.list`. Local state for calendar month/year.
Responsive grid layout.

```tsx
// Layout structure
<div className="p-8 space-y-6">
  <SnapshotCard {...snapshot} />
  <div className="grid gap-6 lg:grid-cols-3">
    <div className="lg:col-span-2 space-y-6">
      <MilestoneRadarChart data={milestones} />
      <SensoryTrendChart data={sensory} />
      <GameScoreTrendChart data={gameScores} />
    </div>
    <div className="space-y-6">
      <SessionCalendar data={calendar} month={month} year={year} onMonthChange={...} />
      <NotesTimeline data={notes} />
    </div>
  </div>
  <PlanTimeline plans={plans} />
</div>
```

## Step 11 — Add Dashboard link to Overview tab

In `_authenticated/children/$childId/index.tsx`, add a `<Link>` to the dashboard
route inside the Overview `TabsContent`, after the two-column grid:

```tsx
<TabsContent value="overview">
  <div className="grid gap-6 md:grid-cols-2">
    {/* Intake Completeness */}
    {/* Actions */}
  </div>
  <div className="mt-6 rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center">
    <Link to="/children/$childId/dashboard" params={{ childId }}>
      View Dashboard
    </Link>
  </div>
</TabsContent>
```

## Verification

- [ ] Snapshot card shows correct attendance % (from `childSnapshot` response)
- [ ] Milestone radar chart renders with correct number of axes (up to 12)
- [ ] Sensory line chart shows data points for initial assessment + each follow-up
- [ ] Per-game score chart renders score history for completed sessions with game results
- [ ] Session calendar colours days correctly by status (blue/green/red/grey)
- [ ] Notes timeline entries are in chronological order (newest first)
- [ ] All charts use the existing Tailwind brown colour palette (`--chart-1`..`--chart-7`)
- [ ] `pnpm check-types` passes
- [ ] `pnpm check` passes (Biome lint + format)

## Blocked by

- None — BE-14 (Dashboards & reporting API) is already implemented
