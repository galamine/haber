# 014 — Game Library Management [AFK]

**Type:** AFK  
**PRD User Stories:** 11, 32

## What to build

Build the global game catalog with versioning and clinic-level toggles. Games are organised into 10 global categories (Gross Motor, Fine Motor, Sensory Integration, Visual-Motor, Cognitive, Speech & Language, Social, Self-Care, Balance, Coordination) with sub-categories. Clinics can add tenant-scoped sub-categories. When building a treatment plan, doctors browse and filter the game library. Each plan pins a specific `game_version` — upgrades require explicit doctor action.

## Acceptance criteria

**Schema / migrations**
- [ ] `GameCategory` model: `id`, `name` (10 global names seeded), `tenantId` (nullable — null for global), `parentCategoryId` (nullable self-FK for sub-categories), `createdAt`
- [ ] `Game` model: `id`, `name`, `description`, `categoryId` (FK to GameCategory), `targetIssues` (JSONB array of strings), `difficultyLevel` enum (`easy` | `medium` | `hard`), `minAgeMonths` (int), `maxAgeMonths` (int), `deployOrigin` (URL of the game's iframe origin), `createdAt`, `updatedAt`
- [ ] `GameVersion` model: `id`, `gameId` (FK), `version` (string e.g. `"1.2.0"`), `releaseNotes` (text nullable), `isCurrent` (boolean), `createdAt`
- [ ] `ClinicGameToggle` model (created in issue 004): `id`, `tenantId` (FK), `gameId` (FK), `enabled` (boolean default true) — clinic-level enable/disable
- [ ] Seed script inserts 10 global `GameCategory` rows

**API endpoints**
- [ ] `GET /games` — returns games enabled for the caller's clinic; supports filters: `categoryId`, `subCategoryId`, `difficulty`, `targetIssue`, `minAge`, `maxAge`, `search` (name); pagination; includes `currentVersion.id` and `currentVersion.version`
- [ ] `GET /games/:id` — game detail with all versions
- [ ] `POST /games` — super_admin only: create a new game
- [ ] `PATCH /games/:id` — super_admin only: update game metadata
- [ ] `POST /games/:id/versions` — super_admin only: create a new version (sets `isCurrent: true`, previous version `isCurrent: false`)
- [ ] `GET /game-categories` — list all categories (global + caller's tenant sub-categories)
- [ ] `POST /game-categories` — clinic_admin only: add tenant-scoped sub-category under an existing global category
- [ ] `PATCH /clinic/game-toggles` (from issue 004) — enable/disable a game for the clinic
- [ ] `GET /treatment-plans/:planId/available-games` — returns games enabled for the clinic, filtered to the plan's target milestone age bands

**Frontend**
- [ ] Game library page (doctor/therapist): filter sidebar (category tree, difficulty chips, age range slider, target issues), game card grid with name, category badge, difficulty, age range, current version
- [ ] Game detail panel/modal: description, all versions with release notes, current version highlighted
- [ ] Within plan builder: "Add Game" drawer uses the same game library browser; selecting a game opens the per-game override form
- [ ] Clinic Admin game toggles (from issue 004): game library admin table with per-row toggle

**Tests**
- [ ] 10 global game categories are seeded
- [ ] `GET /games` returns only clinic-enabled games (disabled games absent)
- [ ] `GET /games` with `categoryId` filter returns only games in that category
- [ ] Creating a new `GameVersion` sets it as `isCurrent: true` and previous version as `isCurrent: false`
- [ ] Clinic A disabling a game → `GET /games` for Clinic A excludes it; Clinic B still sees it
- [ ] Plan game assignment pins `gameVersionId` at creation time — subsequent new version does not change the pin

## QA / Manual testing

- [ ] Log in as doctor → navigate to Game Library → verify 10 categories in the sidebar
- [ ] Filter by category "Balance" → verify only balance games appear
- [ ] Filter by difficulty "Easy" + age range "24–48 months" → verify results narrow appropriately
- [ ] Log in as clinic_admin → navigate to Game Library admin → disable "Colour Sort Game" → log back in as doctor → verify "Colour Sort Game" is absent from the game picker
- [ ] Log in as super_admin → navigate to a game → create a new version "2.0.0" → verify it shows as "Current" and previous version is labelled "Previous"
- [ ] Open a treatment plan → click "Add Game" → verify the clinic-disabled game is absent from the picker

## Blocked by

- Issue 002 — Tenant, Clinic & Subscription Setup
