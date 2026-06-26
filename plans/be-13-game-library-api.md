# Plan: BE-13 — Game Library API

## Context

BE-13 implements the game catalog CRUD, category management, game versioning, and per-clinic enable/disable toggling. The DB models (Game, GameVersion, GameCategory, ClinicGameEnable) already exist in `plans.prisma`. The auth infrastructure already provides `adminProcedure` (SUPER_ADMIN guard), `clinicAdminProcedure` (CLINIC_ADMIN + tenantId guard), and `protectedProcedure` — no new middleware needed.

**Confirmed scope decisions:**
- `game.listCategories` and `game.createSubCategory` currently live in `milestone.ts` — they will be migrated to `game.ts`
- `game.enableForClinic`, `game.disableForClinic`, `game.listEnabledForClinic` currently live in `clinic.ts` — they will be migrated to `game.ts`
- The 10 global categories in `seed-clinical.ts` must be updated to match the issue spec names
- `game.create` creates both the game AND its initial version in a single transaction

---

## Files to create/modify

| Op | Path |
|----|------|
| Modify | `packages/db/prisma/seed-clinical.ts` |
| Create | `packages/api/src/schemas/game.ts` |
| Create | `packages/api/src/routers/game.ts` |
| Modify | `packages/api/src/routers/milestone.ts` |
| Modify | `packages/api/src/routers/clinic.ts` |
| Modify | `packages/api/src/routers/index.ts` |

---

## Step 1 — Update `seed-clinical.ts` category names

**`packages/db/prisma/seed-clinical.ts`** — replace the `GAME_CATEGORIES` array (lines 17–28) with the issue-specified names:

```ts
const GAME_CATEGORIES = [
	{ id: "gc_gross_motor",          name: "Gross Motor" },
	{ id: "gc_fine_motor",           name: "Fine Motor" },
	{ id: "gc_sensory_integration",  name: "Sensory Integration" },
	{ id: "gc_visual_motor",         name: "Visual-Motor" },
	{ id: "gc_cognitive",            name: "Cognitive" },
	{ id: "gc_speech_language",      name: "Speech & Language" },
	{ id: "gc_social",               name: "Social" },
	{ id: "gc_self_care",            name: "Self-Care" },
	{ id: "gc_balance",              name: "Balance" },
	{ id: "gc_coordination",        name: "Coordination" },
] as const;
```

IDs use the `gc_` prefix pattern (stable, existing code uses these IDs). `clinicId: null` and `parentId: null` remain unchanged.

---

## Step 2 — Create `schemas/game.ts`

**Create `packages/api/src/schemas/game.ts`:**

```ts
import { z } from "zod";

// ── Input schemas ──────────────────────────────────────────────────────────

export const CreateGameInput = z.object({
	name: z.string().min(1).max(200),
	description: z.string().optional(),
	categoryId: z.string(),
	subCategory: z.string().optional(),
	targetIssues: z.array(z.string()).default([]),
	difficulty: z.string().optional(),
	ageRangeMin: z.number().int().nonnegative().optional(),
	ageRangeMax: z.number().int().nonnegative().optional(),
	isGlobal: z.boolean().default(true),
});

export const UpdateGameInput = z.object({
	id: z.string(),
	name: z.string().min(1).max(200).optional(),
	description: z.string().optional(),
	categoryId: z.string().optional(),
	subCategory: z.string().optional(),
	targetIssues: z.array(z.string()).optional(),
	difficulty: z.string().optional(),
	ageRangeMin: z.number().int().nonnegative().optional(),
	ageRangeMax: z.number().int().nonnegative().optional(),
	isGlobal: z.boolean().optional(),
});

export const CreateGameVersionInput = z.object({
	gameId: z.string(),
	versionNumber: z.string(),
	rubricVersion: z.string(),
	scoringSchema: z.record(z.string(), z.unknown()).default({}),
});

export const GameListInput = z.object({
	page: z.number().int().positive().default(1),
	pageSize: z.number().int().positive().max(100).default(20),
	categoryId: z.string().optional(),
	subCategory: z.string().optional(),
	targetIssues: z.string().optional(),
	difficulty: z.string().optional(),
	ageRangeMin: z.number().int().nonnegative().optional(),
	ageRangeMax: z.number().int().nonnegative().optional(),
	enabledForClinic: z.boolean().optional(),
});

export const CreateSubCategoryInput = z.object({
	name: z.string().min(1).max(200),
	parentId: z.string(),
});

export const EnableDisableGameInput = z.object({
	gameId: z.string(),
});
```

---

## Step 3 — Create `routers/game.ts`

**Create `packages/api/src/routers/game.ts`:**

Import `adminProcedure`, `clinicAdminProcedure`, `protectedProcedure`, `router` from `"../index"` and `prisma` from `"@haber-final/db"`. Import schemas from `"../schemas/game"`.

### SuperAdmin procedures (use `adminProcedure`)

#### `create` — mutation
Input: `CreateGameInput`
Action: Creates `Game` AND its initial `GameVersion` in a single `$transaction`:
```ts
return prisma.$transaction(async (tx) => {
	const game = await tx.game.create({ data: input });
	await tx.gameVersion.create({
		data: {
			gameId: game.id,
			versionNumber: "1",
			rubricVersion: "1",
			scoringSchema: {},
			isLatest: true,
		},
	});
	return game;
});
```

#### `createVersion` — mutation
Input: `CreateGameVersionInput`
Action: In `$transaction`, set `isLatest: false` on the current latest, then create the new version:
```ts
return prisma.$transaction(async (tx) => {
	await tx.gameVersion.updateMany({
		where: { gameId: input.gameId, isLatest: true },
		data: { isLatest: false },
	});
	return tx.gameVersion.create({
		data: {
			gameId: input.gameId,
			versionNumber: input.versionNumber,
			rubricVersion: input.rubricVersion,
			scoringSchema: input.scoringSchema,
			isLatest: true,
		},
	});
});
```

#### `update` — mutation
Input: `UpdateGameInput`
```ts
const { id, ...data } = input;
return prisma.game.update({ where: { id }, data });
```

#### `deprecate` — mutation
Input: `{ gameId: z.string() }` (uses same EnableDisableGameInput)
Action: Sets `isLatest: false` on the current latest version for the game:
```ts
await prisma.gameVersion.updateMany({
	where: { gameId: input.gameId, isLatest: true },
	data: { isLatest: false },
});
return { success: true };
```

### Protected procedures (use `protectedProcedure`)

#### `get` — query
Input: `{ id: z.string() }`
Action: Returns `Game` with all `GameVersion` records:
```ts
const game = await prisma.game.findUnique({
	where: { id: input.id },
	include: { versions: { orderBy: { createdAt: "desc" } } },
});
if (!game) throw new TRPCError({ code: "NOT_FOUND" });
return game;
```

#### `list` — query
Input: `GameListInput`

Filters logic:
- `categoryId`, `subCategory`, `difficulty`, `ageRangeMin`, `ageRangeMax` — direct equality filters on `game`
- `targetIssues` — `has` array overlap check
- `enabledForClinic: true` — joins `ClinicGameEnable` filtered to `ctx.auth.tenantId` AND `enabled: true`; global games (isGlobal: true) are included unless explicitly disabled

```ts
const { page, pageSize, enabledForClinic, ...filters } = input;
const skip = (page - 1) * pageSize;

const where: any = {};

// Basic filters
if (filters.categoryId) where.categoryId = filters.categoryId;
if (filters.subCategory) where.subCategory = filters.subCategory;
if (filters.difficulty) where.difficulty = filters.difficulty;
if (filters.ageRangeMin) where.ageRangeMin = { gte: filters.ageRangeMin };
if (filters.ageRangeMax) where.ageRangeMax = { lte: filters.ageRangeMax };
if (filters.targetIssues) where.targetIssues = { hasSome: [filters.targetIssues] };

// enabledForClinic filter
if (enabledForClinic === true) {
	const tenantId = ctx.auth.tenantId;
	where.OR = [
		// Global games not explicitly disabled for this clinic
		{
			isGlobal: true,
			NOT: {
				clinicEnables: { some: { clinicId: tenantId!, enabled: false } },
			},
		},
		// Games explicitly enabled for this clinic
		{
			clinicEnables: { some: { clinicId: tenantId!, enabled: true } },
		},
	];
}

const [items, total] = await prisma.$transaction([
	prisma.game.findMany({ where, skip, take: pageSize, orderBy: { createdAt: "desc" } }),
	prisma.game.count({ where }),
]);

return { items, total, page, totalPages: Math.ceil(total / pageSize) };
```

#### `listCategories` — query
Returns all global categories (clinicId: null) AND clinic-specific categories for the caller's clinic:
```ts
return prisma.gameCategory.findMany({
	where: {
		OR: [{ clinicId: null }, { clinicId: ctx.auth.tenantId }],
	},
	orderBy: { name: "asc" },
});
```

#### `listEnabledForClinic` — query
```ts
return prisma.game.findMany({
	where: {
		clinicEnables: { some: { clinicId: ctx.auth.tenantId!, enabled: true } },
	},
	orderBy: { name: "asc" },
});
```

### ClinicAdmin procedures (use `clinicAdminProcedure`)

#### `createSubCategory` — mutation
Input: `CreateSubCategoryInput`
```ts
return prisma.gameCategory.create({
	data: {
		name: input.name,
		parentId: input.parentId,
		clinicId: ctx.auth.tenantId,
	},
});
```

#### `enableForClinic` — mutation
Input: `EnableDisableGameInput`
```ts
await prisma.clinicGameEnable.upsert({
	where: {
		clinicId_gameId: {
			clinicId: ctx.auth.tenantId!,
			gameId: input.gameId,
		},
	},
	create: { clinicId: ctx.auth.tenantId!, gameId: input.gameId, enabled: true },
	update: { enabled: true },
});
```

#### `disableForClinic` — mutation
Input: `EnableDisableGameInput`
```ts
await prisma.clinicGameEnable.upsert({
	where: {
		clinicId_gameId: {
			clinicId: ctx.auth.tenantId!,
			gameId: input.gameId,
		},
	},
	create: { clinicId: ctx.auth.tenantId!, gameId: input.gameId, enabled: false },
	update: { enabled: false },
});
```

---

## Step 4 — Remove migrated procedures from `milestone.ts`

**`packages/api/src/routers/milestone.ts`** — remove:
- `listGameCategories` procedure (lines 34–41)
- `addClinicSubCategory` procedure (lines 43–53)

Also remove the now-unused `AddClinicSubCategoryInput` import from `"../schemas/taxonomy"`.

---

## Step 5 — Remove migrated procedures from `clinic.ts`

**`packages/api/src/routers/clinic.ts`** — remove:
- `enableGame` procedure (lines 224–241)
- `disableGame` procedure (lines 243–260)
- `listEnabledGames` procedure (lines 262–271)

---

## Step 6 — Register `gameRouter` in `index.ts`

**`packages/api/src/routers/index.ts`** — add:

```ts
import { gameRouter } from "./game";
```

And add `game: gameRouter` to the `appRouter` object.

---

## Verification

```bash
# 1. Type check — must pass with zero errors
pnpm check-types

# 2. Lint
pnpm check

# 3. Run seed (requires DB: pnpm db:start)
pnpm db:seed

# 4. Re-run seed to confirm idempotency
pnpm db:seed
```

### Manual logic checks

| Test | Expected |
|------|----------|
| Call `game.create` as THERAPIST | `FORBIDDEN` |
| Call `game.create` as CLINIC_ADMIN | `FORBIDDEN` |
| Call `game.create` as SUPER_ADMIN | Success |
| Call `game.listCategories` as any authenticated user | Returns 10 global + clinic sub-categories |
| Call `game.listCategories` after seed | Returns exactly 10 global categories |
| Call `game.createSubCategory` as SUPER_ADMIN | `FORBIDDEN` (requires CLINIC_ADMIN) |
| Call `game.createSubCategory` as CLINIC_ADMIN | Success; `clinicId` = caller's tenantId |
| Call `game.createVersion` twice | Second call sets new version to `isLatest: true`, previous to `isLatest: false` |
| Call `game.list` with `enabledForClinic: true` as CLINIC_ADMIN | Only games enabled for that clinic (or global non-disabled) |
| Clinic A disables a global game | Clinic B unaffected |
| Call `game.enableForClinic` twice | Idempotent upsert, no error |
| Call `game.listEnabledForClinic` | Returns games explicitly enabled for caller's clinic |

---

## Acceptance Criteria Checklist

- [ ] `game.listCategories` returns exactly 10 global categories after seed
- [ ] `game.list` with `enabledForClinic=true` returns only games enabled for the caller's clinic
- [ ] Clinic disabling a global game hides it from `enabledForClinic` list for that clinic only; other clinics unaffected
- [ ] `game.createVersion` sets `isLatest=true` on the new version and `isLatest=false` on the previous
- [ ] `game.createSubCategory` creates a category with `clinicId` set to the caller's clinic
- [ ] A Therapist calling `game.create` receives `FORBIDDEN`
- [ ] `pnpm check-types` passes
