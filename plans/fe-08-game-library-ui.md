# FE-08: Game Library UI

## Context

We need to build the game library browser for all roles (therapist browse, clinic admin settings, super admin management).

**Stitch exports used:**
- `game_library_therapist_view` → Therapist browse UI
- `clinic_library_management_admin` → Clinic admin settings UI
- `game_detail_view_clinical_specifications` → Game detail sheet

**Design:** Based on existing clinic admin patterns, following `workflow.md` approach.

---

## Screens by Role

### SUPER_ADMIN (Platform)
| Screen | Route | Purpose |
|--------|-------|---------|
| PlatformGamesPage | `/platform/games` | List all global games, create button |
| GameFormPage | `/platform/games/new` | Create new global game |
| GameDetailPage | `/platform/games/:gameId` | View/edit game + version management |

### CLINIC_ADMIN (Settings)
| Screen | Route | Purpose |
|--------|-------|---------|
| ClinicLibrarySettingsPage | `/settings/library` | Enable/disable games, add sub-categories |

### THERAPIST / STAFF / CLINIC_ADMIN (Browse)
| Screen | Route | Purpose |
|--------|-------|---------|
| GameLibraryPage | `/library` | Browse and filter games |

---

## Files to Create / Modify

```
apps/web/src/
├── routes/
│   ├── _authenticated/
│   │   ├── library.tsx                     → /library (THERAPIST/STAFF/CLINIC_ADMIN browse)
│   │   └── settings/
│   │       └── library.tsx                 → /settings/library (CLINIC_ADMIN)
│   │
│   ├── _platform/                          (NEW - SUPER_ADMIN)
│   │   ├── games/
│   │   │   ├── index.tsx                   → /platform/games
│   │   │   ├── new.tsx                     → /platform/games/new
│   │   │   └── $gameId/
│   │   │       └── index.tsx               → /platform/games/:gameId
│   │   └── layout.tsx                      → Platform layout wrapper
│   │
│   └── components/
│       └── game-library/
│           ├── GameLibrarySidebar.tsx      — Filter sidebar
│           ├── GameGrid.tsx                — Game list grid
│           ├── GameCard.tsx                — Individual game card
│           ├── GameDetailSheet.tsx         — Slide-out details
│           ├── GameLibraryBrowserSheet.tsx — Reusable sheet for plan builder
│           ├── ClinicLibrarySettingsTable.tsx — Admin management table
│           ├── CreateSubCategoryForm.tsx   — Sub-category form
│           ├── GameForm.tsx                — Create/edit game form (NEW)
│           ├── GameVersionsTable.tsx       — Version history table (NEW)
│           └── CreateVersionForm.tsx       — Add new version form (NEW)
```

---

## Part 1: Shared Components

### 1.1 Game Library Sidebar
**File:** `components/game-library/GameLibrarySidebar.tsx`
- Category select (from `api.game.listCategories`)
- Search input, Difficulty pills (1-5), Age range slider
- Target issues multi-select checkboxes
- "Clear Filters" button

### 1.2 Game Grid
**File:** `components/game-library/GameGrid.tsx`
- Responsive grid (1/2/3/4 columns)
- Renders `GameCard` or `GameCardSkeleton`
- Manages `GameDetailSheet` state

### 1.3 Game Card
**File:** `components/game-library/GameCard.tsx`
- Thumbnail placeholder (gradient + icon)
- Category badge (top-right), difficulty badge, age range badge
- Name, description excerpt
- "View Details" button
- Bookmark icon (top-right of card)
- Exports `GameCardSkeleton`

### 1.4 Game Detail Sheet
**File:** `components/game-library/GameDetailSheet.tsx`
- Sheet/drawer with full game details
- Module details section (duration, cognitive load, mobility)
- Scoring rubric overview (3 metrics)
- Clinical tags
- "Pin to Plan" button (only when `planId` prop provided)

### 1.5 Game Library Browser Sheet
**File:** `components/game-library/GameLibraryBrowserSheet.tsx`
- Full-screen sheet combining sidebar + grid
- For use in PlanDetailPage (FE-05)
- Currently mocked - `plan.addGame` not yet available

---

## Part 2: Therapist / Staff / Clinic Admin Browse

### 2.1 Game Library Page
**File:** `routes/_authenticated/library.tsx`
**Route:** `/library`
**Access:** THERAPIST, STAFF, CLINIC_ADMIN

- Uses `api.game.list.useQuery({ ..., enabledForClinic: true })`
- Sidebar filters + GameGrid
- Search text filters by name in real-time

### 2.2 Sidebar Navigation Update
**File:** `components/shell/AppShell.tsx`
- Add `/library` to sidebar for THERAPIST, STAFF roles
- CLINIC_ADMIN already has `/settings/library` link

---

## Part 3: Clinic Admin Settings

### 3.1 Settings Route
**File:** `routes/_authenticated/settings/library.tsx`
**Route:** `/settings/library`
**Access:** CLINIC_ADMIN only

### 3.2 Management Table
**File:** `components/game-library/ClinicLibrarySettingsTable.tsx`
- Search input, table with Game Name, Category, Level, Target Issues, Enable/Disable switch
- Toggle calls `api.game.enableForClinic` / `api.game.disableForClinic`
- Disabled games: reduced opacity

### 3.3 Add Sub-Category Form
**File:** `components/game-library/CreateSubCategoryForm.tsx`
- Dialog with Name input + Parent Category select
- Calls `api.game.createSubCategory.useMutation()`

---

## Part 4: Super Admin Platform Game Management

### 4.1 Platform Layout
**File:** `routes/_platform/layout.tsx`
**Access:** SUPER_ADMIN only

- Uses AppShell with platform-specific navigation
- Sidebar shows: Clinics, Platform Games, (no Dashboard/Children)

### 4.2 Platform Games List Page
**File:** `routes/_platform/games/index.tsx`
**Route:** `/platform/games`
**Access:** SUPER_ADMIN

**Components:**
- Page header: "Global Games" title + "Add Game" button
- Search input + filters (category, status)
- Table: Game Name, Category, Versions, Status, Actions
- Actions: Edit, Manage Versions, Deprecate
- Pagination

**tRPC:**
- `api.game.list.useQuery()` - all global games (no clinic filter)
- `api.game.listCategories.useQuery()`

### 4.3 Create Game Page
**File:** `routes/_platform/games/new.tsx`
**Route:** `/platform/games/new`
**Access:** SUPER_ADMIN

**Form Fields:**
- Name (text input, required)
- Description (textarea)
- Category (select from global categories)
- Sub-category (optional text)
- Target Issues (multi-select checkboxes)
- Difficulty (1-5 pills)
- Age Range Min/Max (number inputs)
- Is Global (checkbox, default checked)
- Initial Version Number (default "1.0")
- Rubric Version (text)
- Scoring Schema (textarea or JSON)

**tRPC:** `api.game.create.useMutation()`

### 4.4 Game Detail / Edit Page
**File:** `routes/_platform/games/$gameId/index.tsx`
**Route:** `/platform/games/:gameId`
**Access:** SUPER_ADMIN

**Sections:**
1. **Header** - Game name, category badge, status badge
2. **Edit Form** - Same fields as Create, pre-populated
   - `api.game.get.useQuery({ id })`
   - `api.game.update.useMutation()`
3. **Version History Table** - `GameVersionsTable.tsx`
   - Lists all versions (version number, rubric version, isLatest, created date)
   - Deprecate action per version
4. **Add Version Form** - `CreateVersionForm.tsx`
   - Version number, rubric version, scoring schema
   - `api.game.createVersion.useMutation()`

### 4.5 Game Versions Table
**File:** `components/game-library/GameVersionsTable.tsx`
- Table columns: Version, Rubric Version, Scoring Schema, Status (Latest/Deprecated), Created
- Row actions: View details, Deprecate (if not already deprecated)
- `api.game.deprecate.useMutation()`

### 4.6 Create Version Form
**File:** `components/game-library/CreateVersionForm.tsx`
- Dialog form: Version Number, Rubric Version, Scoring Schema (textarea)
- Calls `api.game.createVersion.useMutation()`

---

## Sidebar Navigation Summary

| Route | SUPER_ADMIN | CLINIC_ADMIN | THERAPIST | STAFF |
|-------|-------------|--------------|-----------|-------|
| `/dashboard` | - | ✅ | ✅ | ✅ |
| `/children` | - | ✅ | ✅ | ✅ |
| `/library` | ✅ (browse) | ✅ (browse) | ✅ (browse) | ✅ (browse) |
| `/settings/library` | - | ✅ | - | - |
| `/settings/staff` | - | ✅ | - | - |
| `/settings/departments` | - | ✅ | - | - |
| `/settings/rooms` | - | ✅ | - | - |
| `/platform/clinics` | ✅ | - | - | - |
| `/platform/games` | ✅ | - | - | - |

---

## UI Primitives Required

Verify existence in `packages/ui/src/components/ui/`:
- [x] `Switch` - shadcn
- [x] `Slider` - shadcn
- [x] `Sheet` - shadcn
- [x] `Checkbox` - shadcn
- [x] `Select` - shadcn
- [x] `Badge` - shadcn
- [x] `Table` - shadcn
- [x] `Dialog` - shadcn
- [x] `Button` - shadcn
- [x] `Input` - shadcn
- [x] `Textarea` - shadcn
- [x] `Skeleton` - shadcn

---

## Verification Checklist

### Browse (All Roles)
- [ ] `/library` loads and displays games
- [ ] Filters work: category, difficulty, age range, target issues
- [ ] Search filters by name in real-time
- [ ] Clicking game opens `GameDetailSheet`
- [ ] `GameDetailSheet` shows all game details
- [ ] Disabled games hidden for non-SUPER_ADMIN roles

### Clinic Admin Settings
- [ ] `/settings/library` accessible only to CLINIC_ADMIN
- [ ] Enable/disable toggle persists and reflects on reload
- [ ] Add Sub-category creates new category
- [ ] New sub-category appears in filter list

### Super Admin Platform
- [ ] `/platform/games` shows all global games
- [ ] Create game form submits successfully
- [ ] Edit game form pre-populates and updates correctly
- [ ] Version history table shows all versions
- [ ] Add new version creates version and sets isLatest=true on previous
- [ ] Deprecate version sets isLatest=false

### General
- [ ] `pnpm check-types` passes
- [ ] `pnpm check` (lint/format) passes

---

## Blocked by

- BE-13 (Game library API) — **Done**
- FE-01 (Navigation infrastructure) — **Done**
- FE-05 (PlanDetailPage + plan.addGame) — **Deferred** (Pin to Plan is mocked)

---

## Dependencies

- `packages/api/src/routers/game.ts` - All game tRPC procedures
- `packages/api/src/schemas/game.ts` - Game input schemas
- `packages/db/prisma/schema/game.prisma` - Game models