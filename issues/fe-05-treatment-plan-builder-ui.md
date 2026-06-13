# FE-05: Treatment Plan Builder & Presets UI

## What to build

Build the treatment plan builder: preset selection, game assignment with duration/rep overrides, plan lifecycle controls (activate, pause, close), and plan modification with goal lifecycle decisions.

**Package:** `apps/web`

### Routes to add

Add these files under `apps/web/src/routes/_authenticated/`:

```
_authenticated/
└── children/
    └── $childId/
        └── plans/
            ├── index.tsx            → /dashboard/children/:childId/plans
            ├── new.tsx              → /dashboard/children/:childId/plans/new
            └── $planId/
                ├── index.tsx        → /dashboard/children/:childId/plans/:planId
                └── edit.tsx         → /dashboard/children/:childId/plans/:planId/edit
```

### Key components

**NewPlanPage:**
- Optional preset selector: card grid with 5 preset options (ASD, CP, ADHD, Down Syndrome, DCD) — calls `plan.listPresets`; selecting a preset pre-fills the form
- Fields: plan name, program length (weeks), session duration (minutes), start date, target milestones multi-select
- Phase builder (optional): add/remove/reorder phase blocks (`{phase, weeks, label}`)
- Submit calls `plan.create`; on success redirects to `PlanDetailPage`

**PlanDetailPage:**
- Header: plan name, version badge, status badge, dates, session duration
- Game assignments table: game name, version, duration, reps/week, phase — with edit/remove inline
- "Add Game" button → opens game library browser (sheet overlay with filters — reuses `GameLibraryBrowserSheet`)
- Duration advisory: shows total session time vs `sessionDurationMinutes`; warns if exceeded (calls `plan.checkSessionDuration`)
- Goal section: lists short-term and long-term goals with status and current attainment %
- Lifecycle buttons: Activate, Pause, Resume, Extend, Close (role-based visibility)
- "Modify Plan" button (only for ACTIVE plans) → opens `ModifyPlanSheet`

**ModifyPlanSheet:**
- Shows current game assignments and goals
- Allows adding/removing games
- Per-goal decision: radio per goal (Continue / Modify / Discontinue); modify shows inline description editor
- "Add New Goal" button for goals to add on the new version
- Submit creates a new plan version

**PlansListPage:**
- Shows all plan versions for a child, grouped visually with parent-child version nesting
- Active plan highlighted; other versions in muted style
- "New Plan" button

### Duration advisory

Show a non-blocking `Alert` component when `plan.checkSessionDuration` returns `exceeds: true`:
> "Total game time (52 min) exceeds session duration (45 min). This is advisory only."

### tRPC hooks used

- `api.plan.listPresets.useQuery()`
- `api.plan.create.useMutation()`
- `api.plan.get.useQuery()`
- `api.plan.list.useQuery()`
- `api.plan.addGame.useMutation()`
- `api.plan.removeGame.useMutation()`
- `api.plan.checkSessionDuration.useQuery()`
- `api.plan.activate.useMutation()`
- `api.plan.pause.useMutation()` / `api.plan.resume.useMutation()`
- `api.plan.close.useMutation()`
- `api.plan.modify.useMutation()`
- `api.goal.list.useQuery()`

## Acceptance criteria

- [ ] Selecting a preset pre-fills the plan form with preset data (name, phases, session duration)
- [ ] Adding a game from the library pins to the correct `gameVersionId`
- [ ] Duration advisory alert appears when total game time exceeds `sessionDurationMinutes`
- [ ] "Activate" transitions plan to ACTIVE status; generates sessions (visible in session view)
- [ ] "Modify Plan" creates a new plan version; old version appears as inactive in the list
- [ ] Per-goal decisions in Modify sheet: "Modify" shows inline description editor; "Discontinue" removes goal from new version
- [ ] `pnpm check-types` passes

## Blocked by

- BE-10 (Treatment plan API)
- FE-02 (Child profile is the entry point to plans)
