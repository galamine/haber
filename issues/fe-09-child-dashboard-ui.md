# FE-09: Per-Child Dashboard & Progress UI

## What to build

Build the per-child longitudinal dashboard: snapshot card, milestone radar chart, sensory system trend charts, per-game score trend lines, session calendar, and notes timeline.

**Package:** `apps/web`

Uses Recharts (already installed) for all data visualisation.

### Routes to add

Add this file under `apps/web/src/routes/_authenticated/`:

```
_authenticated/
└── children/
    └── $childId/
        └── dashboard.tsx            → /dashboard/children/:childId/dashboard
```

Link from `ChildProfilePage` (FE-02) Overview tab using TanStack Router's `<Link to="/dashboard/children/$childId/dashboard" params={{ childId }} />`.

### Key components

**ChildDashboardPage layout (responsive grid):**

**Snapshot card (top):**
- Child photo, name, age, OP number
- Active plan name + version, projected end date
- Next session: date + room
- Attendance %: completed / (completed + absent) sessions

**Milestone radar chart (Recharts `RadarChart`):**
- Each axis: one of the 12 milestones
- One data series per assessment version (initial + each follow-up that updated milestone status)
- Hovering a data point shows assessment date and milestone status

**Sensory system change chart (Recharts `LineChart`):**
- X-axis: assessment date (initial + each follow-up)
- Y-axis: rating (1–5)
- One line per sensory system (7 lines total)
- Togglable via a legend checkboxes

**Per-game score trend charts (Recharts `LineChart`):**
- One chart per game that has results
- X-axis: session date, Y-axis: score
- Shows score trend over time with `rubric_version` labelled on tooltip

**Session calendar (`Calendar` component from ui/):**
- Monthly view
- Day cells coloured by session status (blue=pending, green=completed, red=absent, grey=manually closed)
- Clicking a day opens a popover with session summary

**Notes timeline:**
- Vertical timeline of session notes + assessment notes
- Each entry: date, type badge (Session / Assessment / Follow-up), note excerpt + expand
- Chronological, newest first

**Plan timeline:**
- Horizontal timeline showing plan versions with version markers
- Each marker: plan name, version number, date activated/closed

### tRPC hooks used

- `api.dashboard.childSnapshot.useQuery()`
- `api.dashboard.milestoneRadar.useQuery()`
- `api.dashboard.sensoryDeltaHistory.useQuery()`
- `api.dashboard.gameScoreTrends.useQuery()`
- `api.dashboard.sessionCalendar.useQuery()`
- `api.dashboard.notesTimeline.useQuery()`

## Acceptance criteria

- [ ] Snapshot card shows correct attendance % (updates after sessions are marked)
- [ ] Milestone radar chart renders with correct number of axes (up to 12)
- [ ] Sensory line chart shows data points for initial assessment + each follow-up
- [ ] Per-game score chart renders score history for completed sessions with game results
- [ ] Session calendar colours days correctly by status
- [ ] Notes timeline entries are in chronological order (newest first)
- [ ] All charts use the existing Tailwind brown colour palette (chart CSS variables from `globals.css`)
- [ ] `pnpm check-types` passes

## Blocked by

- BE-14 (Dashboards & reporting API)
- FE-04 (Follow-up assessments provide the sensory delta data points)
