# FE-08: Game Library Browser UI

## Context

We need to build the game library browser for therapists (to filter and browse games when building a plan) and the ClinicAdmin game management panel (to enable/disable games and add sub-categories).

These interfaces are based on the Stitch exports: `game_library_therapist_view`, `clinic_library_management_admin`, and `game_detail_view_clinical_specifications`.

---

## Files to Create / Modify

```
apps/web/src/
  ├── routes/
  │   └── _authenticated/
  │       ├── library.tsx               → /dashboard/library
  │       └── settings/
  │           └── library.tsx           → /dashboard/settings/library
  │
  └── components/
      └── game-library/
          ├── GameLibrarySidebar.tsx    — Filter component
          ├── GameGrid.tsx              — Game list grid
          ├── GameCard.tsx              — Individual game card 
          ├── GameDetailSheet.tsx       — Slide-out details
          ├── GameLibraryBrowserSheet.tsx — Reusable sheet for PlanDetailPage
          ├── ClinicLibrarySettingsTable.tsx — Admin management table
          └── CreateSubCategoryForm.tsx — Sub-category form
```

Also verify if the following UI primitives exist in `@/components/ui/`, otherwise add them via shadcn:
- `Switch`
- `Slider`
- `Sheet` (or `Drawer`)

---

## Part 1: Shared Components & UI Primitives

### 1.1 UI Primitives
Check for `Switch`, `Slider`, `Sheet`, `Checkbox`, `Select`, `Badge` in `packages/ui/src/components/ui/` or `apps/web/src/components/ui/`. If missing, add using `npx shadcn@latest add <component>`.

### 1.2 Game Detail Sheet
**File:** `apps/web/src/components/game-library/GameDetailSheet.tsx`
- Slide-out panel (`Sheet` or `Drawer`) to display full clinical specs, module details, and scoring rubric of a game.
- Includes a "Pin to Plan" action if invoked from the plan builder context.

### 1.3 Reusable Library Browser Sheet
**File:** `apps/web/src/components/game-library/GameLibraryBrowserSheet.tsx`
- A compact Sheet version of the library browser.
- Contains sidebar filters + results grid.
- Selecting a game calls `api.plan.addGame.useMutation()` directly (using the selected `gameId` and a provided `planId`).

---

## Part 2: Therapist Game Library View

### 2.1 Game Library Route
**File:** `apps/web/src/routes/_authenticated/library.tsx`
- Main layout container for the therapist view.
- Uses `api.game.list.useQuery(filters)` to fetch games.

### 2.2 Sidebar Filters
**File:** `apps/web/src/components/game-library/GameLibrarySidebar.tsx`
- Category select: fed by `api.game.listCategories.useQuery()`.
- Search input, Difficulty pills, Age range slider.
- Target issues multi-select (custom checkboxes).
- Updates filter state passed to the parent route.

### 2.3 Game Grid & Cards
**Files:** `apps/web/src/components/game-library/GameGrid.tsx` & `GameCard.tsx`
- Grid container rendering a list of `GameCard` or `GameCardSkeleton`.
- Card displays game thumbnail, category badge, level, age range, excerpt, and a "View Details" button to open the `GameDetailSheet`.

---

## Part 3: Clinic Admin Settings View

### 3.1 Settings Route
**File:** `apps/web/src/routes/_authenticated/settings/library.tsx`
- Main layout for managing available games and categories.

### 3.2 Management Table
**File:** `apps/web/src/components/game-library/ClinicLibrarySettingsTable.tsx`
- Table displaying games with search and category filters.
- Each row shows Game Name, Category, Last Updated, and an Enable/Disable `Switch`.
- Toggling the switch calls `api.game.enableForClinic.useMutation()` or `api.game.disableForClinic.useMutation()`.
- Disabled games should have reduced opacity to indicate their state.

### 3.3 Add Sub-Category Form
**File:** `apps/web/src/components/game-library/CreateSubCategoryForm.tsx`
- Popover or Dialog form containing a "Name" input and "Parent Category" select.
- Calls `api.game.createSubCategory.useMutation()`.

---

## Verification Checklist

1. [ ] Check that `pnpm check-types` and `pnpm check` pass with zero errors.
2. [ ] Verify `GameLibraryPage` filters by category, difficulty, age range, and renders game cards correctly.
3. [ ] Verify search text filters games by name in real-time.
4. [ ] Verify games disabled by the ClinicAdmin do not appear in the therapist's browser.
5. [ ] Verify `GameLibraryBrowserSheet` can be opened (e.g. mock from `PlanDetailPage`) and correctly passes back a selected game.
6. [ ] Verify `ClinicLibrarySettingsPage` toggle persists changes to backend, and page reload reflects the toggled state.
7. [ ] Verify ClinicAdmin can add a sub-category and it appears in the filter list.

---

## Blocked by

- BE-13 (Game library API) — **Done**
- FE-01 (Clinic admin settings navigation must exist for the settings route)
