# Plan: BE-03 — Clinic & Tenant Management API

## Context

BE-03 implements the SuperAdmin-facing clinic CRUD and the ClinicAdmin-facing department/sensory-room management. The DB models (Clinic, Department, SensoryRoom, Game, ClinicGameEnable) already exist from BE-01. The auth infrastructure already provides `adminProcedure` (SUPER_ADMIN guard) and `clinicAdminProcedure` (CLINIC_ADMIN + non-null tenantId guard) — no new middleware is needed.

---

## Files to create / modify

| File | Action |
|------|--------|
| `packages/api/src/schemas/clinic.ts` | **Create** — Zod input schemas |
| `packages/api/src/routers/clinic.ts` | **Create** — full clinicRouter |
| `packages/api/src/routers/index.ts` | **Modify** — register `clinic: clinicRouter` |

---

## Step 1 — `packages/api/src/schemas/clinic.ts`

Define these Zod schemas (following the style in `schemas/taxonomy.ts`):

```ts
// SuperAdmin schemas
CreateClinicInput        // name, address, contactName, contactPhone, contactEmail, timezone?
UpdateClinicInput        // id + all above fields optional
ClinicListInput          // page (default 1), pageSize (default 20, max 100)

// ClinicAdmin schemas
CreateDepartmentInput    // name, headUserId?, description?
UpdateDepartmentInput    // id + name?, headUserId? (nullable), description? (nullable)

CreateSensoryRoomInput   // code, name, departmentId?, equipmentList? (array), status? ("ACTIVE"|"MAINTENANCE")
UpdateSensoryRoomInput   // id + code?, name?, departmentId? (nullable), equipmentList?, status?
```

Validation notes:
- `name`, `address`, `code` — `min(1)`
- `contactEmail` — `z.string().email()`
- `timezone` — `z.string()` (no enum; DB default is `"Asia/Kolkata"`)
- `equipmentList` — `z.array(z.unknown()).default([])`

---

## Step 2 — `packages/api/src/routers/clinic.ts`

Import `adminProcedure`, `clinicAdminProcedure`, `router` from `"../index"` and `prisma` from `"@haber-final/db"`.

### SuperAdmin procedures (all use `adminProcedure`)

#### `create` — mutation
Input: `CreateClinicInput`
Action: `prisma.clinic.create({ data: input })`
Return: created `Clinic`

#### `list` — query
Input: `ClinicListInput`
Action:
```ts
const skip = (page - 1) * pageSize;
const [items, total] = await prisma.$transaction([
  prisma.clinic.findMany({ where: { deletedAt: null }, skip, take: pageSize, orderBy: { createdAt: "desc" } }),
  prisma.clinic.count({ where: { deletedAt: null } }),
]);
return { items, total, page, totalPages: Math.ceil(total / pageSize) };
```

#### `get` — query
Input: `{ id: z.string() }`
Action: `prisma.clinic.findFirst({ where: { id, deletedAt: null } })`
Throw `NOT_FOUND` if null.

#### `update` — mutation
Input: `UpdateClinicInput` (id + optional fields)
Action: `prisma.clinic.update({ where: { id }, data: rest })`
Return: updated `Clinic`

#### `platformSummary` — query
No input. Returns `ClinicSummary[]` — one entry per non-deleted clinic.

```ts
const clinics = await prisma.clinic.findMany({ where: { deletedAt: null } });
const now = new Date();
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
const endOfMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 1);

return Promise.all(clinics.map(async (clinic) => {
  const [activeChildren, activeTherapists, sessionsThisMonth] = await Promise.all([
    prisma.child.count({ where: { clinicId: clinic.id, deletedAt: null } }),
    prisma.user.count({ where: { clinicId: clinic.id, role: "THERAPIST" } }),
    prisma.therapySession.count({
      where: {
        plan: { clinicId: clinic.id },
        scheduledDate: { gte: startOfMonth, lt: endOfMonth },
      },
    }),
  ]);
  return { name: clinic.name, createdAt: clinic.createdAt, activeChildren, activeTherapists, sessionsThisMonth };
}));
```

> **Assumption — activeTherapists**: counts all users with `role = THERAPIST` in the clinic (no `loginEnabled` filter).

> **sessions join**: `TherapySession` has no direct `clinicId` — the query filters via `plan: { clinicId: clinic.id }` (through `TreatmentPlan`).

---

### ClinicAdmin procedures (all use `clinicAdminProcedure`, all scoped to `ctx.auth.tenantId`)

Security rule for mutations: every `update`/`delete`/`toggle` includes `clinicId: ctx.auth.tenantId` in the `where` clause to prevent cross-tenant mutation.

#### `createDepartment` — mutation
Input: `CreateDepartmentInput`
```ts
prisma.department.create({ data: { ...input, clinicId: ctx.auth.tenantId } })
```

#### `listDepartments` — query
```ts
prisma.department.findMany({ where: { clinicId: ctx.auth.tenantId }, orderBy: { createdAt: "asc" } })
```

#### `updateDepartment` — mutation
Input: `UpdateDepartmentInput` (id + optional fields)
```ts
const { id, ...data } = input;
prisma.department.update({ where: { id, clinicId: ctx.auth.tenantId }, data })
```

#### `deleteDepartment` — mutation
Input: `{ id: z.string() }`
```ts
await prisma.department.delete({ where: { id: input.id, clinicId: ctx.auth.tenantId } });
```
Return: void (undefined)

#### `createSensoryRoom` — mutation
Input: `CreateSensoryRoomInput`
```ts
prisma.sensoryRoom.create({ data: { ...input, clinicId: ctx.auth.tenantId } })
```

#### `listSensoryRooms` — query
```ts
prisma.sensoryRoom.findMany({ where: { clinicId: ctx.auth.tenantId }, orderBy: { createdAt: "asc" } })
```

#### `updateSensoryRoom` — mutation
Input: `UpdateSensoryRoomInput`
```ts
const { id, ...data } = input;
prisma.sensoryRoom.update({ where: { id, clinicId: ctx.auth.tenantId }, data })
```

#### `toggleRoomStatus` — mutation
Input: `{ id: z.string() }`
```ts
const room = await prisma.sensoryRoom.findFirst({
  where: { id: input.id, clinicId: ctx.auth.tenantId },
});
if (!room) throw new TRPCError({ code: "NOT_FOUND" });
return prisma.sensoryRoom.update({
  where: { id: input.id },
  data: { status: room.status === "ACTIVE" ? "MAINTENANCE" : "ACTIVE" },
});
```

#### `enableGame` — mutation
Input: `{ gameId: z.string() }`
```ts
prisma.clinicGameEnable.upsert({
  where: { clinicId_gameId: { clinicId: ctx.auth.tenantId, gameId: input.gameId } },
  create: { clinicId: ctx.auth.tenantId, gameId: input.gameId, enabled: true },
  update: { enabled: true },
})
```

#### `disableGame` — mutation
Input: `{ gameId: z.string() }`
```ts
await prisma.clinicGameEnable.upsert({
  where: { clinicId_gameId: { clinicId: ctx.auth.tenantId, gameId: input.gameId } },
  create: { clinicId: ctx.auth.tenantId, gameId: input.gameId, enabled: false },
  update: { enabled: false },
});
```
Return: void

#### `listEnabledGames` — query
```ts
prisma.game.findMany({
  where: {
    clinicEnables: {
      some: { clinicId: ctx.auth.tenantId, enabled: true },
    },
  },
  orderBy: { name: "asc" },
})
```

---

## Step 3 — Register in `packages/api/src/routers/index.ts`

```diff
+import { clinicRouter } from "./clinic";

 export const appRouter = router({
   healthCheck: ...,
   auth: authRouter,
   taxonomy: taxonomyRouter,
   milestone: milestoneRouter,
+  clinic: clinicRouter,
 });
```

---

## Verification

```bash
pnpm check-types     # must pass with zero errors
```

Manual logic checks:
- Call `clinic.list` as SUPER_ADMIN → returns `{ items, total, page, totalPages }`
- Call `clinic.list` as CLINIC_ADMIN → receives `FORBIDDEN`
- Call `clinic.createDepartment` as THERAPIST → receives `FORBIDDEN`
- Call `clinic.updateDepartment` with an id belonging to another clinic → Prisma `where { id, clinicId: tenantId }` finds no record → throws `P2025` — no cross-tenant data exposed
- Call `clinic.toggleRoomStatus` on a room from another clinic → `NOT_FOUND`
- Call `clinic.enableGame` / `disableGame` on same gameId twice → idempotent upsert, no duplicate key error
