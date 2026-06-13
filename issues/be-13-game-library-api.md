# BE-13: Game Library API

## What to build

Implement game catalog CRUD, category management (10 global categories + tenant sub-categories), game versioning, and per-clinic enable/disable toggling. The 10 global categories are seeded at startup.

**Packages:** `packages/api`, `packages/db`

### tRPC procedures

Add `packages/api/src/routers/game.ts`:

```
// Game catalog (SuperAdmin for globals; ClinicAdmin for clinic-scoped)
game.create        (SUPER_ADMIN) → Game
  input: { name, description, categoryId, subCategory?, targetIssues, difficulty?,
           ageRangeMin?, ageRangeMax?, isGlobal }

game.createVersion (SUPER_ADMIN) → GameVersion
  input: { gameId, versionNumber, rubricVersion, scoringSchema }
  — Sets isLatest=true on new version; sets isLatest=false on previous latest

game.get           (protected) → GameWithVersions
game.list          (protected) → PaginatedGames
  input: { page, pageSize, categoryId?, subCategory?, targetIssues?, difficulty?,
           ageRangeMin?, ageRangeMax?, enabledForClinic?: boolean }
  — If enabledForClinic=true, filters to games enabled for the caller's clinic
  — Global games always included unless clinic disabled them

game.update        (SUPER_ADMIN) → Game
game.deprecate     (SUPER_ADMIN) → GameVersion   (sets isLatest=false, no deletion)

// Category management
game.listCategories     (protected) → GameCategory[]
  — Returns 10 global + clinic-specific sub-categories for the caller's clinic
game.createSubCategory  (CLINIC_ADMIN) → GameCategory
  input: { name, parentId }   // parentId must be a global category

// Clinic enable/disable (covered here; also exposed on clinic router in BE-03)
game.enableForClinic    (CLINIC_ADMIN) → void
game.disableForClinic   (CLINIC_ADMIN) → void
game.listEnabledForClinic (protected) → Game[]
```

### Seed global categories

In `packages/db/prisma/seed-clinical.ts` (from BE-02), also seed the 10 global `GameCategory` rows:
`Gross Motor, Fine Motor, Sensory Integration, Visual-Motor, Cognitive, Speech & Language, Social, Self-Care, Balance, Coordination`

### Shared schemas

Add:
- `CreateGameInput`, `CreateGameVersionInput`, `GameSchema`, `GameVersionSchema`, `GameCategorySchema`

## Acceptance criteria

- [ ] `game.listCategories` returns exactly 10 global categories after seed
- [ ] `game.list` with `enabledForClinic=true` returns only games enabled for the caller's clinic
- [ ] Clinic disabling a global game hides it from `enabledForClinic` list for that clinic only; other clinics unaffected
- [ ] `game.createVersion` sets `isLatest=true` on the new version and `isLatest=false` on the previous
- [ ] `game.createSubCategory` creates a category with `clinicId` set to the caller's clinic
- [ ] A Therapist calling `game.create` receives `FORBIDDEN`
- [ ] `pnpm check-types` passes

## Blocked by

- BE-03 (Clinic context needed for enable/disable scoping)
- BE-01c (Game, GameVersion, GameCategory, ClinicGameEnable models)
