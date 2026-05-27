# FE-08: Game Library Browser UI

## What to build

Build the game library browser for therapists (filter + browse games when building a plan) and the ClinicAdmin game management panel (enable/disable games, add sub-categories).

**Package:** `apps/web`

### Routes to add

Add these files under `apps/web/src/routes/_authenticated/`:

```
_authenticated/
├── library.tsx                      → /dashboard/library
└── settings/
    └── library.tsx                  → /dashboard/settings/library
```

### Key components

**GameLibraryPage:**
- Filter sidebar: category (select from `game.listCategories`), difficulty, age range sliders, target issues multi-select, search text
- Game grid: cards with game name, category badge, difficulty badge, age range, description excerpt, "View details" button
- Game detail sheet (Drawer/Sheet from ui/): full description, current version, scoring rubric overview, "Pin to Plan" button (if accessed from plan builder context)

**GameLibraryBrowserSheet (reusable):**
- Compact version of the library browser embedded in `PlanDetailPage` (FE-05) as a sheet overlay when "Add Game" is clicked
- Filters + results; selecting a game calls `plan.addGame` directly
- Used in: PlanDetailPage, and standalone GameLibraryPage

**ClinicLibrarySettingsPage:**
- Table of all global games with enable/disable toggle per row
- Toggle calls `game.enableForClinic` / `game.disableForClinic`
- Disabled games are greyed out and unavailable to therapists in the browser
- "Add Sub-category" button → form with parent category selector + name

### tRPC hooks used

- `api.game.list.useQuery()`
- `api.game.listCategories.useQuery()`
- `api.game.enableForClinic.useMutation()`
- `api.game.disableForClinic.useMutation()`
- `api.game.createSubCategory.useMutation()`

## Acceptance criteria

- [ ] `GameLibraryPage` filters by category and renders game cards correctly
- [ ] Search text filters games by name in real-time
- [ ] Games disabled by the ClinicAdmin do not appear in the therapist's browser
- [ ] `GameLibraryBrowserSheet` can be opened from `PlanDetailPage` and a selected game is added to the plan
- [ ] `ClinicLibrarySettingsPage` toggle persists; page reload reflects the toggled state
- [ ] ClinicAdmin can add a sub-category; it appears in the filter list
- [ ] `pnpm check-types` passes

## Blocked by

- BE-13 (Game library API)
- FE-01 (Clinic admin settings navigation must exist for the settings route)
