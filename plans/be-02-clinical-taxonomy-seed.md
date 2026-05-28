# BE-02: Clinical Taxonomy Seed & Milestone Framework API

## Context

Load clinical reference data from `clinical-data/clinical-taxonomies.seed.json` into the DB and expose it via tRPC. All taxonomy records are global (`clinicId = null`); clinic admins can extend with tenant-scoped records. Blocked by BE-01b (tables already exist).

**Confirmed deviations from issue spec:**
- Equipment has 43 items in JSON, not 45 — seed all 43 (issue AC says 45, which is wrong)
- GameCategory has no seed data in JSON — hardcode 10 global OT-domain categories in the seed script

---

## Files to create/modify

| Op | Path |
|----|------|
| Create | `packages/db/prisma/seed-clinical.ts` |
| Modify | `packages/db/package.json` |
| Modify | `package.json` (root) |
| Modify | `packages/api/src/index.ts` |
| Create | `packages/api/src/schemas/taxonomy.ts` |
| Create | `packages/api/src/routers/taxonomy.ts` |
| Create | `packages/api/src/routers/milestone.ts` |
| Modify | `packages/api/src/routers/index.ts` |

---

## Step 1 — Add `clinicAdminProcedure` to API

**`packages/api/src/index.ts`** — append after the existing `adminProcedure` block (line 63):

```ts
const enforceClinicAdmin = enforceAuth.unstable_pipe(async ({ ctx, next }) => {
  if (ctx.auth.role !== "CLINIC_ADMIN" || ctx.auth.tenantId === null) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});

export const clinicAdminProcedure = t.procedure.use(enforceClinicAdmin);
```

Both conditions must fail to reject: a `CLINIC_ADMIN` without a bound `tenantId` is also rejected.

---

## Step 2 — Add schemas

**Create `packages/api/src/schemas/taxonomy.ts`:**

```ts
import { z } from "zod";

export const DiagnosisSchema = z.object({ id: z.string(), label: z.string(), clinicId: z.string().nullable() });
export const FunctionalConcernSchema = z.object({ id: z.string(), label: z.string(), clinicId: z.string().nullable() });
export const AssessmentToolSchema = z.object({ id: z.string(), label: z.string(), clinicId: z.string().nullable() });
export const EquipmentSchema = z.object({ id: z.string(), label: z.string(), clinicId: z.string().nullable() });
export const InterventionApproachSchema = z.object({ id: z.string(), label: z.string(), clinicId: z.string().nullable() });
export const SensorySystemSchema = z.object({ id: z.string(), label: z.string(), order: z.number() });
export const MilestoneSchema = z.object({
  id: z.string(),
  frameworkId: z.string(),
  ageMinMonths: z.number().nullable(),
  ageMaxMonths: z.number().nullable(),
  scoringScaleMin: z.number().nullable(),
  scoringScaleMax: z.number().nullable(),
  description: z.string(),
  parentMilestoneId: z.string().nullable(),
  extensions: z.unknown(),
});
export const GameCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  clinicId: z.string().nullable(),
  parentId: z.string().nullable(),
});

// Mutation inputs
export const AddTaxonomyItemInput = z.object({ label: z.string().min(1).max(200) });
export const AddMilestoneExtensionInput = z.object({
  description: z.string().min(1).max(500),
  ageMinMonths: z.number().int().nonnegative().nullish(),
  ageMaxMonths: z.number().int().nonnegative().nullish(),
  scoringScaleMin: z.number().int().nullish(),
  scoringScaleMax: z.number().int().nullish(),
  extensions: z.record(z.unknown()).optional(),
});
export const AddClinicSubCategoryInput = z.object({
  name: z.string().min(1).max(200),
  parentId: z.string().nullish(),
});
```

---

## Step 3 — `taxonomy` router

**Create `packages/api/src/routers/taxonomy.ts`:**

All list procedures use `protectedProcedure`. Write procedures use `clinicAdminProcedure`.

```
taxonomy.listDiagnoses              (protected) → prisma.diagnosis.findMany({ where: { OR: [{ clinicId: null }, { clinicId: ctx.auth.tenantId }] } })
taxonomy.listFunctionalConcerns     (protected) → same pattern on functionalConcern
taxonomy.listAssessmentTools        (protected) → same pattern on assessmentTool
taxonomy.listEquipment              (protected) → same pattern on equipment
taxonomy.listInterventionApproaches (protected) → same pattern on interventionApproach
taxonomy.listSensorySystems         (protected) → prisma.sensorySystem.findMany({ orderBy: { order: "asc" } })

taxonomy.addClinicDiagnosis  (clinicAdmin) → prisma.diagnosis.create({ data: { label, clinicId: ctx.auth.tenantId } })
taxonomy.addClinicEquipment  (clinicAdmin) → prisma.equipment.create({ data: { label, clinicId: ctx.auth.tenantId } })
```

For list procedures, the `OR` filter returns global (`clinicId: null`) + tenant-scoped (`clinicId: ctx.auth.tenantId`) records. `SensorySystem` has no `clinicId` field — no OR filter needed.

Imports: `protectedProcedure`, `clinicAdminProcedure`, `router` from `../index`; `AddTaxonomyItemInput` from `../schemas/taxonomy`.

---

## Step 4 — `milestone` router

**Create `packages/api/src/routers/milestone.ts`:**

```
milestone.list               (protected)    → prisma.milestone.findMany({ where: { frameworkId: { in: ["global", `clinic_${ctx.auth.tenantId}`] } } })
milestone.addClinicExtension (clinicAdmin)  → prisma.milestone.create({ data: { ...input, frameworkId: `clinic_${ctx.auth.tenantId}` } })
milestone.listGameCategories (protected)    → prisma.gameCategory.findMany({ where: { OR: [{ clinicId: null }, { clinicId: ctx.auth.tenantId }] } })
milestone.addClinicSubCategory (clinicAdmin)→ prisma.gameCategory.create({ data: { name, parentId, clinicId: ctx.auth.tenantId } })
```

`addClinicExtension` uses `AddMilestoneExtensionInput`; `addClinicSubCategory` uses `AddClinicSubCategoryInput`.

---

## Step 5 — Register routers

**`packages/api/src/routers/index.ts`:**

```ts
import { publicProcedure, router } from "../index";
import { authRouter } from "./auth";
import { taxonomyRouter } from "./taxonomy";
import { milestoneRouter } from "./milestone";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => "OK"),
  auth: authRouter,
  taxonomy: taxonomyRouter,
  milestone: milestoneRouter,
});
export type AppRouter = typeof appRouter;
```

---

## Step 6 — Seed script

**Create `packages/db/prisma/seed-clinical.ts`:**

Follow the `seed-super-admin.ts` pattern (import dotenv, env, createPrismaClient). Load JSON via `createRequire` (safest ESM approach with tsx):

```ts
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const seedData = require("../../../clinical-data/clinical-taxonomies.seed.json");
```

**Upsert order (all with `for...of` + `await`):**

1. **Diagnoses** (12): `upsert({ where: { id }, update: { label }, create: { id, label, clinicId: null } })`
2. **FunctionalConcerns** (16): same pattern
3. **AssessmentTools** (14): same pattern
4. **Equipment** (43 — JSON has 43, not 45): same pattern
5. **InterventionApproaches** (16): same pattern
6. **SensorySystems** (7): include `order: index + 1` (1-based) in both update and create
7. **Milestones** (12): map `label → description`, `frameworkId: "global"`, all age/scoring fields null
8. **GameCategories** (10 hardcoded with stable `gc_` prefixed IDs):

```ts
const GAME_CATEGORIES = [
  { id: "gc_fine_motor",          name: "Fine Motor" },
  { id: "gc_gross_motor",         name: "Gross Motor" },
  { id: "gc_sensory_processing",  name: "Sensory Processing" },
  { id: "gc_adl_self_care",       name: "ADL / Self-Care" },
  { id: "gc_cognitive_attention", name: "Cognitive & Attention" },
  { id: "gc_social_emotional",    name: "Social & Emotional" },
  { id: "gc_communication",       name: "Communication" },
  { id: "gc_visual_perception",   name: "Visual Perception" },
  { id: "gc_oral_motor_feeding",  name: "Oral Motor / Feeding" },
  { id: "gc_play_leisure",        name: "Play & Leisure" },
];
// upsert: where { id }, update { name }, create { id, name, clinicId: null, parentId: null }
```

Stable `gc_` prefixed IDs are necessary because `GameCategory` has no `@@unique` constraint on `name`.

---

## Step 7 — `package.json` scripts

**`packages/db/package.json`** — add to `scripts`:
```json
"seed:clinical": "DOTENV_CONFIG_PATH=../../apps/server/.env tsx prisma/seed-clinical.ts"
```

**Root `package.json`** — add to `scripts`:
```json
"db:seed": "pnpm --filter @haber-final/db seed:clinical"
```

---

## Verification

```bash
# 1. Type check
pnpm check-types

# 2. Lint
pnpm check

# 3. Run seed (requires DB running: pnpm db:start)
pnpm db:seed

# 4. Re-run seed to confirm idempotency (no errors, no duplicates)
pnpm db:seed

# 5. Spot-check record counts via Prisma Studio (pnpm db:studio) or psql
# diagnosis: 12, functional_concern: 16, assessment_tool: 14,
# equipment: 43, intervention_approach: 16, sensory_system: 7,
# milestone (frameworkId="global"): 12, game_category (clinicId=null): 10
```
