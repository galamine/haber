# BE-02: Clinical Taxonomy Seed & Milestone Framework API

## What to build

Load the clinical reference data from `clinical-data/clinical-taxonomies.seed.json` into the database and expose it via tRPC procedures. Also expose tRPC procedures for the milestone framework with tenant extension support.

**Packages:** `packages/api`, `packages/shared`

### Seed data loading

Create `packages/api/prisma/seed-clinical.ts` that reads `clinical-data/clinical-taxonomies.seed.json` and upserts all taxonomy records at startup (or via `pnpm --filter api db:seed`).

Taxonomies to seed (all as global records with `clinicId = null`):
- 12 diagnoses
- 12 developmental milestones (with `frameworkId = "global"`, age bands TBD)
- 7 sensory systems (with `order` field)
- 16 functional concerns
- 14 standardised assessment tools
- 45 equipment items
- 16 intervention approaches

### tRPC procedures

Add `packages/api/src/router/taxonomy.ts`:

```
taxonomy.listDiagnoses         (protected) → Diagnosis[]
taxonomy.listFunctionalConcerns (protected) → FunctionalConcern[]
taxonomy.listAssessmentTools   (protected) → AssessmentTool[]
taxonomy.listEquipment         (protected) → Equipment[]
taxonomy.listInterventionApproaches (protected) → InterventionApproach[]
taxonomy.listSensorySystems    (protected) → SensorySystem[]

taxonomy.addClinicDiagnosis    (clinicAdmin) → Diagnosis
taxonomy.addClinicEquipment    (clinicAdmin) → Equipment
```

Add `packages/api/src/router/milestone.ts`:

```
milestone.list                 (protected) → Milestone[]  (global + tenant)
milestone.addClinicExtension   (clinicAdmin) → Milestone
milestone.listGameCategories   (protected) → GameCategory[]
milestone.addClinicSubCategory (clinicAdmin) → GameCategory
```

### Shared schemas

Add to `packages/shared/src/schemas/`:
- `DiagnosisSchema`, `FunctionalConcernSchema`, `AssessmentToolSchema`, `EquipmentSchema`, `InterventionApproachSchema`, `SensorySystemSchema`
- `MilestoneSchema`, `GameCategorySchema`

## Acceptance criteria

- [ ] Running `pnpm --filter api db:seed` upserts all global taxonomy records without duplicates
- [ ] `taxonomy.listDiagnoses` returns the 12 seeded diagnoses for any authenticated user
- [ ] `taxonomy.listSensorySystems` returns exactly 7 systems in correct order
- [ ] `taxonomy.addClinicDiagnosis` allows CLINIC_ADMIN to add a tenant-scoped diagnosis; the new record has `clinicId` set
- [ ] `taxonomy.listDiagnoses` for a clinic returns global + that clinic's extensions
- [ ] `milestone.list` returns the 12 global milestones
- [ ] `milestone.addClinicExtension` creates a milestone with `frameworkId = "clinic_{clinicId}"`
- [ ] `milestone.listGameCategories` returns the 10 global categories
- [ ] `pnpm typecheck` and `pnpm check` pass

## Blocked by

- BE-01b (taxonomy tables must exist)
