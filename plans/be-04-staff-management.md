# BE-04: Staff Management & Permissions API — Implementation Plan

## Context

Implements staff invite, role/permission management, department assignment, and deactivation for the Haber clinic platform. Staff are users with role `THERAPIST` or `STAFF`, scoped to a clinic via `clinicId`. Builds on the existing User model (BE-01), OTP auth flow (BE-00), and Clinic/Department models (BE-03).

Key decisions:
- **Duplicate email on invite**: Hard error (`CONFLICT`) regardless of which clinic the user belongs to
- **PERMISSIONS constant**: Only 3 entries — `child.intake`, `session.run`, `treatment_plan.modify`

---

## Files to Create / Modify

| File | Action |
|------|--------|
| `packages/db/prisma/schema/staff.prisma` | CREATE — new Prisma models |
| `packages/db/prisma/schema/auth.prisma` | MODIFY — add back-relations to `User` |
| `packages/api/src/schemas/staff.ts` | CREATE — Zod schemas + PERMISSIONS constant |
| `packages/api/src/trpc.ts` | MODIFY — add `hasPermission` utility |
| `packages/api/src/routers/staff.ts` | CREATE — tRPC staff router |
| `packages/api/src/routers/index.ts` | MODIFY — register `staffRouter` |

---

## Step 1 — Database Schema

### Create `packages/db/prisma/schema/staff.prisma`

```prisma
model UserPermission {
  id         String @id @default(uuid())
  userId     String
  permission String

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([userId, permission])
}

model UserDepartmentAssignment {
  userId       String
  departmentId String
  assignedAt   DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([userId, departmentId])
}
```

Note: `departmentId` is a plain string (no FK to Department). Validation that departments belong to the caller's clinic is enforced at the procedure level, not via DB constraint.

### Modify `packages/db/prisma/schema/auth.prisma`

Add back-relations to the `User` model (required by Prisma for both `@relation` sides):

```prisma
model User {
  // ... existing fields ...
  permissions           UserPermission[]
  departmentAssignments UserDepartmentAssignment[]
}
```

### Run migrations

```bash
pnpm db:migrate   # creates migration file and runs it
pnpm db:generate  # regenerates Prisma client
```

---

## Step 2 — Zod Schemas (`packages/api/src/schemas/staff.ts`)

```typescript
import { z } from "zod";

export const PERMISSIONS = {
  CHILD_INTAKE: "child.intake",
  SESSION_RUN: "session.run",
  TREATMENT_PLAN_MODIFY: "treatment_plan.modify",
} as const;

export const StaffRoleSchema = z.enum(["THERAPIST", "STAFF"]);

export const InviteStaffInput = z.object({
  email: z.string().email(),
  role: StaffRoleSchema,
  permissions: z.array(z.string()).default([]),
  departmentIds: z.array(z.string()).default([]),
});

export const UpdatePermissionsInput = z.object({
  userId: z.string(),
  permissions: z.array(z.string()),
});

export const AssignDepartmentsInput = z.object({
  userId: z.string(),
  departmentIds: z.array(z.string()),
});

export const StaffListInput = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
  role: StaffRoleSchema.optional(),
  departmentId: z.string().optional(),
});

export const UpdateCredentialsInput = z.object({
  userId: z.string(),
  credentialsQualifications: z.string().optional(),
  credentialsRegistrationNumber: z.string().optional(),
});
```

`UserWithPermissionsSchema` is not defined as a Zod schema — Prisma's return type (with `include: { permissions: true }`) is used directly as the TypeScript return type.

---

## Step 3 — `hasPermission` Utility (`packages/api/src/trpc.ts`)

Add after the existing procedure exports:

```typescript
export async function hasPermission(
  ctx: { auth: AuthUser },
  permission: string,
): Promise<boolean> {
  const record = await prisma.userPermission.findUnique({
    where: { userId_permission: { userId: ctx.auth.userId, permission } },
  });
  return record !== null;
}
```

Plain async helper, not middleware. Procedures gate on granular permissions by calling `await hasPermission(ctx, PERMISSIONS.CHILD_INTAKE)` inside their handler.

---

## Step 4 — Staff Router (`packages/api/src/routers/staff.ts`)

Reuse: `generateOtp`, `hashValue` from `../lib/otp`; `Resend` from `resend`; `env` from `@haber-final/env/server`.

### Local helper (DRY)

Several procedures need "verify user belongs to caller's clinic":

```typescript
async function getStaffOrThrow(userId: string, clinicId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, clinicId },
    include: { permissions: true },
  });
  if (!user) throw new TRPCError({ code: "NOT_FOUND" });
  return user;
}
```

### `staff.invite` — `clinicAdminProcedure`

1. `prisma.user.findUnique({ where: { email } })` → if exists, throw `TRPCError({ code: "CONFLICT", message: "Email already registered" })`
2. Generate OTP (`generateOtp()`) and hash it
3. `prisma.$transaction`:
   - `prisma.user.create({ data: { email, role, clinicId: ctx.auth.tenantId!, loginEnabled: true } })`
   - `prisma.userPermission.createMany({ data: permissions.map(p => ({ userId, permission: p })) })`
   - `prisma.userDepartmentAssignment.createMany({ data: departmentIds.map(d => ({ userId, departmentId: d })) })`
   - `prisma.otp.create({ data: { userId, codeHash: hashValue(code), expiresAt: new Date(Date.now() + OTP_EXPIRY_MS) } })`
4. Outside transaction: `resend.emails.send(...)` with invite subject
5. Return `{ message: "OTP sent" }`

OTP_EXPIRY_MS: 10 minutes (same as auth.ts).

### `staff.list` — `clinicAdminProcedure`

```typescript
const where = {
  clinicId: ctx.auth.tenantId!,
  role: { in: ["THERAPIST", "STAFF"] as const },
  ...(input.role ? { role: input.role } : {}),
  ...(input.departmentId
    ? { departmentAssignments: { some: { departmentId: input.departmentId } } }
    : {}),
};
const [items, total] = await prisma.$transaction([
  prisma.user.findMany({
    where,
    include: { permissions: true },
    skip: (input.page - 1) * input.pageSize,
    take: input.pageSize,
    orderBy: { createdAt: "desc" },
  }),
  prisma.user.count({ where }),
]);
return { items, total, page: input.page, totalPages: Math.ceil(total / input.pageSize) };
```

### `staff.get` — `clinicAdminProcedure`

- Input: `z.object({ userId: z.string() })`
- `getStaffOrThrow(input.userId, ctx.auth.tenantId!)` → returns user with permissions

### `staff.updatePermissions` — `clinicAdminProcedure`

1. `getStaffOrThrow(input.userId, ctx.auth.tenantId!)`
2. Transaction: `deleteMany({ where: { userId } })` then `createMany({ data: permissions.map(...) })`
3. Return updated user with permissions

### `staff.assignDepartments` — `clinicAdminProcedure`

1. `getStaffOrThrow(input.userId, ctx.auth.tenantId!)`
2. If `departmentIds` non-empty: validate all IDs belong to caller's clinic:
   ```typescript
   const valid = await prisma.department.findMany({
     where: { id: { in: departmentIds }, clinicId: ctx.auth.tenantId! },
     select: { id: true },
   });
   if (valid.length !== departmentIds.length)
     throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid department IDs" });
   ```
3. Transaction: `deleteMany({ where: { userId } })` then `createMany({ data: departmentIds.map(...) })`
4. Return void

### `staff.deactivate` — `clinicAdminProcedure`

1. `getStaffOrThrow(input.userId, ctx.auth.tenantId!)`
2. `prisma.user.update({ where: { id: input.userId }, data: { loginEnabled: false } })`

### `staff.reactivate` — `clinicAdminProcedure`

1. `getStaffOrThrow(input.userId, ctx.auth.tenantId!)`
2. `prisma.user.update({ where: { id: input.userId }, data: { loginEnabled: true } })`

### `staff.updateCredentials` — `protectedProcedure` (inline auth check)

```typescript
protectedProcedure
  .input(UpdateCredentialsInput)
  .mutation(async ({ input, ctx }) => {
    const isSelf = ctx.auth.userId === input.userId;
    const isClinicAdmin = ctx.auth.role === "CLINIC_ADMIN" && ctx.auth.tenantId !== null;
    if (!isSelf && !isClinicAdmin)
      throw new TRPCError({ code: "FORBIDDEN" });

    if (isClinicAdmin && !isSelf) {
      const target = await prisma.user.findFirst({
        where: { id: input.userId, clinicId: ctx.auth.tenantId! },
      });
      if (!target) throw new TRPCError({ code: "NOT_FOUND" });
    }

    const { userId, ...data } = input;
    return prisma.user.update({ where: { id: userId }, data });
  })
```

---

## Step 5 — Register Router (`packages/api/src/routers/index.ts`)

```typescript
import { staffRouter } from "./staff";
// add to appRouter:
staff: staffRouter,
```

---

## Verification

```bash
pnpm db:migrate
pnpm db:generate
pnpm check-types
pnpm check
```

**Manual acceptance checks (per issue criteria):**
1. `staff.invite` → user created in DB with correct role/clinicId + invite OTP email sent
2. Invited user → `auth.verifyOtp` → receives access token (invite OTP works)
3. `staff.list` from a different clinic admin → empty result (no cross-tenant leak)
4. `staff.updatePermissions` → `staff.get` reflects updated permissions
5. `staff.deactivate` → `auth.requestOtp` silently no-ops (loginEnabled=false guard in auth.ts)
6. `staff.reactivate` → login works again
7. `staff.updateCredentials` as therapist for own userId → success; for other userId → FORBIDDEN
8. THERAPIST calling `staff.invite` → FORBIDDEN (clinicAdminProcedure blocks it)
9. `pnpm check-types` → zero errors
