# BE-13: Game Library API

## Context

The Haber Specialisto clinical toolkit requires a game catalog with versioning and per-clinic availability. `Game`, `GameVersion`, `GameCategory`, and `ClinicGameEnable` models exist in `plans.prisma` (BE-01c). The 10 global categories are already seeded in `packages/db/prisma/seed-clinical.ts` and must NOT be overwritten.

The existing global categories are: Fine Motor, Gross Motor, Sensory Processing, ADL / Self-Care, Cognitive & Attention, Social & Emotional, Communication, Visual Perception, Oral Motor / Feeding, Play & Leisure.

**BE-03 and BE-01c are both done — this can proceed.**

## Files to Create

```
packages/api/src/schemas/game.ts
packages/api/src/routers/game.ts
```

## Files to Modify

```
packages/api/src/routers/index.ts          — register gameRouter
```

---

## Implementation Details

### `packages/api/src/schemas/game.ts`

```typescript
export const CreateGameInput = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    categoryId: z.string(),
    subCategory: z.string().optional(),
    targetIssues: z.array(z.string()).default([]),
    difficulty: z.string().optional(),
    ageRangeMin: z.number().int().optional(),
    ageRangeMax: z.number().int().optional(),
    isGlobal: z.boolean().default(true),
});

export const CreateGameVersionInput = z.object({
    gameId: z.string(),
    versionNumber: z.string(),
    rubricVersion: z.string(),
    scoringSchema: z.record(z.unknown()).default({}),
});
```

### `packages/api/src/routers/game.ts`

Procedures:

| Procedure | Auth | Notes |
|-----------|------|-------|
| `create` | `adminProcedure` | Creates game |
| `createVersion` | `adminProcedure` | Sets new version `isLatest=true`, previous `isLatest=false` |
| `get` | `protectedProcedure` | Returns game with versions and clinic enables |
| `list` | `protectedProcedure` | Paginated; if `enabledForClinic=true`, filters by clinic enables + global |
| `update` | `adminProcedure` | Update game fields |
| `deprecate` | `adminProcedure` | Sets `isLatest=false` |
| `listCategories` | `protectedProcedure` | Returns global + clinic-specific sub-categories |
| `createSubCategory` | `clinicAdminProcedure` | `parentId` must be a global category (clinicId = null) |
| `enableForClinic` | `clinicAdminProcedure` | Upserts `ClinicGameEnable` with `enabled=true` |
| `disableForClinic` | `clinicAdminProcedure` | Upserts `ClinicGameEnable` with `enabled=false` |
| `listEnabledForClinic` | `protectedProcedure` | Returns enabled games for calling clinic |

`list` with `enabledForClinic=true`: returns games where `OR: [{ clinicEnables: { clinicId, enabled: true } }, { isGlobal: true }]`, minus any global games the clinic has explicitly disabled.

---

## Out of Scope

- Webhook or game launch mechanism — handled in BE-12
- Frontend game browser UI — handled in FE-08

---

## Verification

1. `pnpm check-types` — must pass
2. `pnpm check` (Biome) — on new files
3. `game.listCategories` returns exactly 10 global categories (pre-seeded)
4. `game.createVersion` sets `isLatest` correctly on new and previous version
5. `game.createSubCategory` fails if `parentId` is not a global category
6. Therapist calling `game.create` receives `FORBIDDEN`
7. `game.disableForClinic` on a global game hides it from `listEnabledForClinic` for that clinic only
