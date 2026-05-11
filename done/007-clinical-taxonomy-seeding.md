# 007 — Clinical Taxonomy Seeding [AFK]

**Type:** AFK  
**PRD User Stories:** 65, 66, 67

## What to build

Seed the clinical reference data from `clinical-data/clinical-taxonomies.seed.json` into proper database tables. These taxonomies (diagnoses, milestones, sensory systems, functional concerns, assessment tools, equipment, intervention approaches) are used across Form 1, Form 2, treatment plans, and the recommender. Clinics can add tenant-scoped extensions to each taxonomy.

## Acceptance criteria

**Schema / migrations**
- [ ] `Diagnosis` model: `id`, `name`, `icdReference` (nullable), `frameworkId` (`global` | `clinic_{tenantId}`), `tenantId` (nullable FK — null for global entries), `createdAt`
- [ ] `Milestone` model: `id`, `name`, `ageBandMinMonths` (int), `ageBandMaxMonths` (int), `scoringScaleMin` (int), `scoringScaleMax` (int), `description` (text), `parentMilestoneId` (nullable self-FK for hierarchy), `frameworkId`, `tenantId` (nullable), `extensions` (JSONB), `createdAt`
- [ ] `SensorySystem` model: `id`, `name` (e.g. "Tactile", "Vestibular"), `description`, `frameworkId`, `tenantId` (nullable), `createdAt`
- [ ] `FunctionalConcern` model: `id`, `name` (e.g. "Pencil grasp", "Scissors use"), `category` (nullable), `frameworkId`, `tenantId` (nullable), `createdAt`
- [ ] `AssessmentTool` model: `id`, `name` (e.g. "SP2", "BOT-2", "PDMS-2"), `fullName` (nullable), `description` (nullable), `frameworkId`, `tenantId` (nullable), `createdAt`
- [ ] `Equipment` model: `id`, `name`, `category` (nullable), `frameworkId`, `tenantId` (nullable), `createdAt`
- [ ] `InterventionApproach` model: `id`, `name`, `description` (nullable), `frameworkId`, `tenantId` (nullable), `createdAt`
- [ ] Prisma seed script reads `clinical-data/clinical-taxonomies.seed.json` and inserts all global entries with `frameworkId: 'global'`, `tenantId: null`

**API endpoints**
- [ ] `GET /taxonomies/diagnoses` — returns global + caller's tenant-scoped diagnoses
- [ ] `GET /taxonomies/milestones` — returns global + tenant milestones (includes hierarchy via `parentMilestoneId`)
- [ ] `GET /taxonomies/sensory-systems` — returns global + tenant sensory systems
- [ ] `GET /taxonomies/functional-concerns` — returns global + tenant functional concerns
- [ ] `GET /taxonomies/assessment-tools` — returns global + tenant assessment tools
- [ ] `GET /taxonomies/equipment` — returns global + tenant equipment
- [ ] `GET /taxonomies/intervention-approaches` — returns global + tenant intervention approaches
- [ ] `POST /taxonomies/:type` — clinic_admin only: add a tenant-scoped extension entry; `frameworkId` auto-set to `clinic_{tenantId}`
- [ ] `DELETE /taxonomies/:type/:id` — clinic_admin only: soft-delete tenant-scoped extensions (global entries cannot be deleted)

**Frontend**
- [ ] No dedicated taxonomy management page required for this issue — the endpoints are consumed by assessment form dropdowns/multi-selects (implemented in issues 008–010)
- [ ] "Clinic Extensions" section on clinic setup page: per-taxonomy table showing custom entries, with "Add" button and delete action for each

**Tests**
- [ ] Seed script inserts all expected global diagnoses, milestones, sensory systems, functional concerns, assessment tools, equipment, and intervention approaches
- [ ] `GET /taxonomies/diagnoses` for a clinic returns global entries + that clinic's extensions, not another clinic's extensions
- [ ] Clinic admin adds a custom diagnosis → it appears in `GET /taxonomies/diagnoses` for that clinic only
- [ ] Attempting to delete a global taxonomy entry returns 403 `CANNOT_DELETE_GLOBAL_TAXONOMY`
- [ ] 12 developmental milestones are seeded (head control, rolling, sitting, crawling, standing, walking, first words, two-word phrases, toilet training, self-feeding, dressing, eye contact/social smile)
- [ ] 7 sensory systems are seeded (Tactile, Vestibular, Proprioceptive, Auditory, Visual, Olfactory/Gustatory, Interoception)
- [ ] 14 assessment tools are seeded (including SP2, BOT-2, PDMS-2, CARS-2, COPM, MABC-2)

## QA / Manual testing

- [ ] Run `pnpm prisma:seed` → verify no errors → query the database to confirm expected row counts for each taxonomy table
- [ ] Log in as clinic_admin → navigate to Clinic Setup → Clinic Extensions tab → click "Add Diagnosis" → enter a custom diagnosis name → save → verify it appears in the clinic's diagnosis list
- [ ] Open a different clinic's admin → verify the custom diagnosis does NOT appear in their taxonomy
- [ ] Try to delete the global "ASD" diagnosis from the API → verify 403 is returned
- [ ] Open a Form 1 draft (after issues 008–010 are complete) → verify the diagnosis multi-select shows both global entries and the custom extension

## Design Decisions (resolved)

- **Seed scope:** Only 7 DB models. `session_quality_tags`, `home_program_compliance`, `session_engagement`, `goal_status`, `goal_horizon`, `goal_status_decisions` → Zod enums in `@haber/shared` (fixed enumerations; clinics will never extend them).

- **Milestone model:** `parentMilestoneId` and `extensions` JSONB fields dropped. No hierarchy in seed data — 12 milestones are flat.

- **Milestone age bands (WHO/CDC):**
  | Milestone | Min months | Max months |
  |---|---|---|
  | Head control | 1 | 4 |
  | Rolling | 3 | 6 |
  | Sitting | 4 | 9 |
  | Crawling | 6 | 12 |
  | Standing | 8 | 14 |
  | Walking | 10 | 18 |
  | First words | 9 | 18 |
  | Two-word phrases | 18 | 30 |
  | Toilet training | 18 | 36 |
  | Self-feeding | 8 | 18 |
  | Dressing | 24 | 48 |
  | Eye contact/Social smile | 1 | 3 |

- **Milestone scoring scale:** All 12 milestones seeded with `scoringScaleMin=0`, `scoringScaleMax=5` (ordinal — gives form rendering flexibility without a future migration).

- **Delete strategy:** Hard delete for tenant extensions. No `deletedAt` on taxonomy models. Global entries return 403 `CANNOT_DELETE_GLOBAL_TAXONOMY`.

- **Permissions:** GET endpoints reuse existing `child.intake` (covers clinic_admin + therapist). POST/DELETE use new `manageTaxonomies` permission added to `clinic_admin` only.

- **Architecture:** Single polymorphic taxonomy route/controller/service with a `MODEL_MAP` type-dispatch. Not 7 separate files per taxonomy.

- **Response shape:** Flat array `{ data: TaxonomyItem[] }`. No pagination — consumers are form dropdowns that need the full list.

## Blocked by

- Issue 002 — Tenant, Clinic & Subscription Setup
