# BE-15: DPDP Compliance (Soft Delete & 7-Year Retention)

## Context

Implements India's DPDP Act: soft-delete for Child/Guardian records, 7-year retention enforcement, and India data residency.

**Existing work NOT to duplicate:**
- `child.softDelete` already sets `deletedAt = now()` (`child.ts:206-226`)
- `child.list` already filters `deletedAt: null` for non-admins (`child.ts:163`)
- `getChildForRead`, `assertChildInClinic` already check `deletedAt: null`
- `adminProcedure` exists for SUPER_ADMIN (`index.ts:57-64`)
- `clinicAdminProcedure` exists for CLINIC_ADMIN (`index.ts:66-73`)
- Logger (`pino`) already configured at `packages/api/src/lib/logger.ts`
- Env validation via `@t3-oss/env-core` with Zod

**Blockers:**
- BE-05 — `Guardian` model lacks `deletedAt` field (must be added first)

**Key technical note:**
The issue proposes `$use` middleware which is **not supported** with Prisma driver adapters (`PrismaPg`). The codebase uses Prisma 7.8.0 with `@prisma/adapter-pg`. This plan uses Prisma client extensions (`$extends`) with a query extension instead, which is the supported approach for driver adapters.

---

## Decisions

| Question | Decision |
|---|---|
| Why add `deletedAt` to Guardian? | Guardian has no soft-delete field but soft-delete should cascade; extension filters both models |
| Why separate `dpdp.ts` router? | DPDP is distinct compliance domain; keeps child CRUD separate |
| Why `adminProcedure` for permanentDelete? | SUPER_ADMIN only; `clinicAdminProcedure` excludes SUPER_ADMIN |
| Why `$extends` instead of `$use`? | `$use` is not available when using Prisma driver adapters (`PrismaPg`). `$extends` with query extension is the supported alternative |
| Why `protectedProcedure` for retentionReport? | Issue specifies SUPER_ADMIN \| CLINIC_ADMIN. `clinicAdminProcedure` excludes SUPER_ADMIN, so manual role check is needed |

---

## Files to Create

| File | Purpose |
|---|---|
| `packages/api/src/routers/dpdp.ts` | New router for `dpdp.retentionReport` |

---

## Files to Modify

| File | Change |
|---|---|
| `packages/db/prisma/schema/clinical.prisma` | Add `deletedAt DateTime?` to Guardian model |
| `packages/db/src/index.ts` | Add Prisma `$extends` query extension for soft-delete filtering |
| `packages/env/src/server.ts` | Add `DATA_REGION` env var with `"india"` enum |
| `packages/api/src/routers/child.ts` | Add `listDeleted`, `permanentDelete` procedures; update `list` to pass `includeDeleted` for admins |
| `packages/api/src/routers/index.ts` | Register `dpdpRouter` |
| `apps/server/src/index.ts` | Add startup warning if `DATA_REGION !== "india"` |
| `apps/server/.env.example` | Document `DATA_REGION` env var |

---

## Step 1 — Add `deletedAt` to Guardian model

**File:** `packages/db/prisma/schema/clinical.prisma`

```prisma
model Guardian {
  id        String    @id @default(cuid())
  childId   String    @unique
  userId    String?
  name      String
  relation  String
  phone     String
  email     String?
  deletedAt DateTime?  // NEW — DPDP soft-delete support

  child Child @relation(fields: [childId], references: [id])

  @@map("guardian")
}
```

Run `pnpm db:push` from `packages/db/` to apply.

---

## Step 2 — Add Prisma soft-delete query extension

**File:** `packages/db/src/index.ts`

`$use` is not available with `PrismaPg` adapter. Use `$extends` with a query extension instead:

```typescript
import { env } from "@haber-final/env/server";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../prisma/generated/client";

const SOFT_DELETE_MODELS = ["Child", "Guardian"];
const SOFT_DELETE_ACTIONS = ["findMany", "findFirst", "findUnique", "findUniqueOrThrow"];

export function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
  });

  return new PrismaClient({ adapter }).$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (
            SOFT_DELETE_MODELS.includes(model) &&
            SOFT_DELETE_ACTIONS.includes(operation) &&
            !args?.where?.includeDeleted
          ) {
            args.where = { ...args.where, deletedAt: null };
          }
          if (args?.where?.includeDeleted !== undefined) {
            const { includeDeleted, ...rest } = args.where;
            args.where = rest;
          }
          return query(args);
        },
      },
    },
  });
}

const prisma = createPrismaClient();
export default prisma;
```

**How it works:**
- Automatically adds `deletedAt: null` to all find queries on `Child` and `Guardian`
- Procedures that need soft-deleted records pass `includeDeleted: true` in the `where` clause
- The extension strips `includeDeleted` before the query reaches Prisma

---

## Step 3 — Add `DATA_REGION` env var

**File:** `packages/env/src/server.ts`

Add after `CLOUDINARY_URL`:

```typescript
DATA_REGION: z.enum(["india"]).default("india"),
```

**File:** `apps/server/src/index.ts`

Add startup warning after the `serve()` call (around line 268):

```typescript
if (env.DATA_REGION !== "india") {
  logger.warn("DATA_REGION should be set to 'india' for DPDP compliance");
}
```

**File:** `apps/server/.env.example`

Add:

```ini
# DPDP compliance — must be 'india' for data residency
DATA_REGION=india
```

---

## Step 4 — Add `listDeleted` procedure

**File:** `packages/api/src/routers/child.ts`

Add inside `childRouter` (after `softDelete`):

```typescript
listDeleted: clinicAdminProcedure
  .input(ChildListInput)
  .query(async ({ input, ctx }) => {
    const where = {
      ...(ctx.auth.role !== "SUPER_ADMIN" ? { clinicId: ctx.auth.tenantId ?? undefined } : {}),
      deletedAt: { not: null },
      includeDeleted: true,
    };
    const [items, total] = await prisma.$transaction([
      prisma.child.findMany({
        where,
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        orderBy: { deletedAt: "desc" },
        include: { guardian: true },
      }),
      prisma.child.count({ where }),
    ]);
    return { items, total, page: input.page, totalPages: Math.ceil(total / input.pageSize) };
  }),
```

---

## Step 5 — Add `permanentDelete` procedure

**File:** `packages/api/src/routers/child.ts`

Add inside `childRouter` (after `listDeleted`):

```typescript
permanentDelete: adminProcedure
  .input(z.object({ childId: z.string() }))
  .mutation(async ({ input }) => {
    const SEVEN_YEARS_MS = 7 * 365.25 * 24 * 60 * 60 * 1000;
    const child = await prisma.child.findUnique({
      where: { id: input.childId, includeDeleted: true },
    });

    if (!child?.deletedAt) throw new TRPCError({ code: "NOT_FOUND" });

    const retentionExpired = Date.now() - child.deletedAt.getTime() > SEVEN_YEARS_MS;
    if (!retentionExpired) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Cannot permanently delete: record is within 7-year retention window",
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.consentRecord.deleteMany({ where: { childId: input.childId } });
      await tx.consentInvitation.deleteMany({ where: { childId: input.childId } });
      await tx.initialAssessment.deleteMany({ where: { childId: input.childId } });
      await tx.guardian.deleteMany({ where: { childId: input.childId } });
      await tx.child.delete({ where: { id: input.childId } });
    });
  }),
```

---

## Step 6 — Create `dpdp.ts` router

**File:** `packages/api/src/routers/dpdp.ts`

```typescript
import prisma from "@haber-final/db";
import { protectedProcedure, router } from "../index";

export const dpdpRouter: ReturnType<typeof router> = router({
  retentionReport: protectedProcedure.query(async ({ ctx }) => {
    const SEVEN_YEARS_MS = 7 * 365.25 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    const children = await prisma.child.findMany({
      where: {
        ...(ctx.auth.role !== "SUPER_ADMIN" ? { clinicId: ctx.auth.tenantId ?? undefined } : {}),
        deletedAt: { not: null },
        includeDeleted: true,
      },
      include: { guardian: true },
      orderBy: { deletedAt: "desc" },
    });

    return children.map((child) => ({
      id: child.id,
      fullName: child.fullName,
      opNumber: child.opNumber,
      deletedAt: child.deletedAt,
      retentionExpiresAt: new Date(child.deletedAt!.getTime() + SEVEN_YEARS_MS),
      pastRetentionWindow: now - child.deletedAt!.getTime() > SEVEN_YEARS_MS,
      guardian: child.guardian,
    }));
  }),
});
```

---

## Step 7 — Update `child.list` for admin visibility

**File:** `packages/api/src/routers/child.ts`

The existing `list` procedure (line 161-166) currently shows soft-deleted records to admins via `...(!isAdmin ? { deletedAt: null } : {})`. With the new extension, admins also need `includeDeleted: true`:

```typescript
const where = {
  ...(role !== "SUPER_ADMIN" ? { clinicId: tenantId ?? undefined } : {}),
  ...(!isAdmin ? { deletedAt: null } : {}),
  ...(isAdmin ? { includeDeleted: true } : {}),
  ...(input.consentStatus ? { consentStatus: input.consentStatus } : {}),
  ...(extraAnd.length > 0 ? { AND: extraAnd } : {}),
};
```

---

## Step 8 — Register `dpdpRouter`

**File:** `packages/api/src/routers/index.ts`

Add import and register:

```typescript
import { dpdpRouter } from "./dpdp";

// Add to appRouter:
dpdp: dpdpRouter,
```

---

## Verification

- [ ] `child.softDelete` sets `deletedAt = now()` and record disappears from `child.list` for non-admins
- [ ] `child.list` still shows soft-deleted records for admins (CLINIC_ADMIN / SUPER_ADMIN)
- [ ] `child.listDeleted` returns soft-deleted children with `includeDeleted: true`
- [ ] `child.permanentDelete` throws FORBIDDEN if `deletedAt` is within 7 years
- [ ] `child.permanentDelete` succeeds for records past 7-year window
- [ ] `dpdp.retentionReport` returns retention expiry dates and flags past-window records
- [ ] Prisma extension correctly excludes `deletedAt IS NOT NULL` rows from standard Child/Guardian queries
- [ ] Admin passing `includeDeleted: true` receives soft-deleted records
- [ ] Startup logs warning if `DATA_REGION !== "india"`
- [ ] `DATA_REGION` documented in `apps/server/.env.example`
- [ ] `pnpm check-types` passes

---

## Blocked by

- BE-05 — Guardian must have `deletedAt` field before extension can filter it
