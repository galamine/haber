# BE-05: Child Intake & Guardian Registration API

## Context

The platform needs the first data-entry surface of the clinical workflow: registering a child for therapy. Intake staff create a child profile together with the child's guardians, capture demographic/medical history, and assign a treating therapist. Downstream issues (BE-06 consent, BE-07 assessment, BE-10 treatment plans) all hang off a `Child` record, so this issue establishes child CRUD, guardian registration, therapist assignment, and an intake-completeness gate.

The schema for `Child`, `Guardian`, `ConsentRecord`, and `ChildTherapistAssignment` already exists (`packages/db/prisma/schema/clinical.prisma`). The auth/permission system (BE-04) is in place: JWT-derived `ctx.auth = { userId, role, tenantId, familyId }`, role-based procedures (`adminProcedure`, `clinicAdminProcedure`), and a `hasPermission(ctx, permission)` DB lookup helper (`packages/api/src/index.ts:74`). The `child.intake` permission string already exists as `PERMISSIONS.CHILD_INTAKE` (`packages/api/src/schemas/staff.ts`).

### Decisions captured from the user
1. **Guardian users**: Add a `GUARDIAN` value to the `UserRole` enum. Email is **required** on each `GuardianInput`; every guardian gets a unique `User` row with `role = GUARDIAN`, `loginEnabled = false`.
2. **Intake gating**: child.intake-gated procedures require an **explicit** `child.intake` `UserPermission` row — **no admin bypass** (a CLINIC_ADMIN without the permission row is rejected).
3. **Read access**: CLINIC_ADMIN / SUPER_ADMIN read any child in their clinic; THERAPIST and STAFF are restricted to children assigned to them (via `ChildTherapistAssignment` or `preferredTherapistId`), otherwise `FORBIDDEN`.
4. **Intake-complete definition**: required = `opNumber`, `fullName`, `dob`, `sex`, non-empty `spokenLanguages`, ≥1 guardian, and `consentStatus = GRANTED` (every guardian has ≥1 `ConsentRecord`).

## Migration (`packages/db`)

Add to `schema/clinical.prisma` `Child` model:
```prisma
medicalHistory Json @default("{}")
```
Add to `schema/auth.prisma` `UserRole` enum:
```prisma
GUARDIAN
```
Run `pnpm db:migrate` to generate one migration covering both changes, then `pnpm db:generate`.

Also extend the zod role enum for consistency: add `"GUARDIAN"` to `UserRoleSchema` in `packages/api/src/schemas/index.ts`.

## Shared schemas — new file `packages/api/src/schemas/child.ts`

Follow the existing style in `schemas/staff.ts` / `schemas/clinic.ts` (Create = required unless `.optional()`/`.default()`; Update = `id` first then all-optional).

- `GuardianInput` = `{ name, relation, phone, email: z.string().email() }` (email required per decision 1).
- `MedicalHistoryInput` = `{ birthHistory, immunisations, allergies, currentMedications, priorDiagnoses, familyHistory, sensorySensitivities }` — model loosely as strings (use `z.string()` / `.optional()`); serialized to the `medicalHistory` JSON column.
- `CreateChildInput` = `{ opNumber, fullName, dob: z.coerce.date(), sex, photoUrl?, address?, heightCm?, weightKg?, weightMeasuredAt?, spokenLanguages: z.array(z.string()), school?, preferredTherapistId?, guardians: z.array(GuardianInput).min(1) }`.
- `UpdateChildInput` = `{ id }` + all the above scalar fields optional, **excluding `consentStatus`** and excluding `guardians`/`medicalHistory` (those have dedicated procedures).
- `ChildListInput` = `{ page: default 1, pageSize: max 100 default 20, search?, therapistId?, consentStatus?: ConsentStatusSchema }` (mirror `StaffListInput`).
- `AssignTherapistInput` = `{ childId, therapistId, reviewDueAt?: z.coerce.date().optional() }`.
- `UnassignTherapistInput` = `{ childId, therapistId }`.
- `ConsentStatusSchema = z.enum(["PENDING","GRANTED","WITHDRAWN"])`.
- Response schemas `ChildSchema`, `ChildWithGuardiansSchema` for typing (the issue lists them under "Shared schemas").

Export everything; no central re-export is required (routers import from `../schemas/<name>` directly, as staff/clinic do).

## Router — new file `packages/api/src/routers/child.ts`

Imports: `prisma from "@haber-final/db"`, `TRPCError`, `z`, and `{ protectedProcedure, clinicAdminProcedure, router, hasPermission }` from `../index`.

### Reusable helpers (top of file)
- `async function requireIntakePermission(ctx)` — throws `FORBIDDEN` unless `await hasPermission(ctx, PERMISSIONS.CHILD_INTAKE)`. **No admin bypass** (decision 2). Used by create/update/updateMedicalHistory.
- `async function getChildForRead(childId, ctx)` — loads child scoped to clinic (`clinicId: ctx.auth.tenantId` for CLINIC_ADMIN; no clinic filter for SUPER_ADMIN), `deletedAt: null`. Then enforces decision 3: if role is THERAPIST/STAFF, confirm the child is assigned to `ctx.auth.userId` (a `ChildTherapistAssignment` row OR `child.preferredTherapistId === userId`), else `FORBIDDEN`. Returns the child or throws `NOT_FOUND`.
- `async function assertChildInClinic(childId, tenantId)` — `findFirst({ id, clinicId: tenantId, deletedAt: null })`, throw `NOT_FOUND` if missing (used by intake mutations).

### Procedures
All use `protectedProcedure` as the base (then layer the permission/role check inside), since the gating rules don't map cleanly onto the existing role-only procedures.

- **`create`** (`requireIntakePermission`) → `Child`. Validate `preferredTherapistId` (if given) is a THERAPIST in the clinic. For each guardian email check no existing `User` (CONFLICT on duplicate, like `staff.invite`). In one `prisma.$transaction(async (tx) => …)`: create `Child` (`clinicId = ctx.auth.tenantId!`, `consentStatus` defaults to PENDING, `medicalHistory` defaults `{}`); for each guardian create a `User` (`role: "GUARDIAN"`, `loginEnabled: false`, `clinicId: tenantId`, `email`) then a `Guardian` row linked to that `userId` and the child. Return the created child.
- **`get`** (`protectedProcedure`) → `ChildWithGuardians`. Uses `getChildForRead`, includes `guards`. (Satisfies "assigned therapist can get; unassigned therapist FORBIDDEN".)
- **`list`** (`protectedProcedure`) → `{ items, total, page, totalPages }`. Build `where`: SUPER_ADMIN → all; CLINIC_ADMIN → `clinicId: tenantId`; THERAPIST/STAFF → `clinicId: tenantId` **and** assigned-to-me filter (`OR: [{ preferredTherapistId: userId }, { id: { in: assignedChildIds } }]`). Exclude `deletedAt: null` **unless** caller is CLINIC_ADMIN/SUPER_ADMIN (decision: "excludes soft-deleted unless admin"). Apply `search` (case-insensitive `fullName`/`opNumber` contains), `therapistId`, `consentStatus` filters via conditional spreads (mirror `staff.list`). Paginate with `prisma.$transaction([findMany, count])`.
- **`update`** (`requireIntakePermission`) → `Child`. `assertChildInClinic`, then `prisma.child.update` with `{ ...data }` (consentStatus not in the input, so it can't be touched).
- **`updateMedicalHistory`** (`requireIntakePermission`) → `Child`. `assertChildInClinic`, then `update` setting `medicalHistory: input` (the 7 history fields packed into the JSON column).
- **`softDelete`** (role CLINIC_ADMIN or SUPER_ADMIN; inline role check, not permission) → void. `assertChildInClinic` (SUPER_ADMIN: skip clinic filter), set `deletedAt: new Date()`.
- **`checkIntakeComplete`** (`protectedProcedure`, reuse `getChildForRead` so access rules apply) → `{ complete, missingFields }`. Load child with `guards` + consent counts. Build `missingFields` from decision 4: push `"opNumber"`, `"fullName"`, `"dob"`, `"sex"` if falsy; `"spokenLanguages"` if empty; `"guardians"` if none; `"consent"` if `consentStatus !== "GRANTED"` or any guardian has zero `ConsentRecord`. `complete = missingFields.length === 0`.
- **`assignTherapist`** (CLINIC_ADMIN role **or** `hasPermission(child.intake)`) → `ChildTherapistAssignment`. Validate child + therapist both in clinic (therapist `role: THERAPIST`). Idempotent: if a `ChildTherapistAssignment` for `(childId, therapistId)` exists, return it; else create. (No DB unique constraint added — app-level dedupe keeps the migration minimal and preserves the model's review-tracking fields.)
- **`unassignTherapist`** (CLINIC_ADMIN role) → void. `deleteMany({ childId, therapistId })` after `assertChildInClinic`.
- **`listAssignedChildren`** (`protectedProcedure`) → `{ items, total, page, totalPages }`. Find `ChildTherapistAssignment` where `therapistId = ctx.auth.userId`, collect `childId`s, fetch children scoped to clinic + `deletedAt: null`, paginate. (Input: reuse pagination shape.)

## Register router

In `packages/api/src/routers/index.ts`, import `childRouter` and add `child: childRouter` to `appRouter` (alongside `staff`, `clinic`, etc.).

## Critical files
- `packages/db/prisma/schema/clinical.prisma` — add `medicalHistory` to `Child`
- `packages/db/prisma/schema/auth.prisma` — add `GUARDIAN` to `UserRole`
- `packages/api/src/schemas/child.ts` — **new**
- `packages/api/src/schemas/index.ts` — add `GUARDIAN` to `UserRoleSchema`
- `packages/api/src/routers/child.ts` — **new**
- `packages/api/src/routers/index.ts` — register `child`

## Reuse
- `hasPermission` (`packages/api/src/index.ts:74`) and `PERMISSIONS.CHILD_INTAKE` (`schemas/staff.ts`) for intake gating.
- `staff.invite` transaction + duplicate-email `CONFLICT` pattern (`routers/staff.ts:31`) for guardian User creation.
- `staff.list` conditional-spread `where` + `prisma.$transaction([findMany, count])` + `{ items, total, page, totalPages }` return shape (`routers/staff.ts:97`).
- `clinic.list`/`clinic.get` `deletedAt: null` soft-delete pattern (`routers/clinic.ts`).

## Verification
1. `pnpm db:migrate` then `pnpm db:generate` — migration applies cleanly; Prisma client regenerates with `medicalHistory` + `GUARDIAN`.
2. `pnpm check-types` passes across packages (acceptance criterion).
3. `pnpm check` (Biome) clean on the new files.
4. Manual end-to-end against `pnpm dev:server` (or a quick script through the tRPC caller) covering each acceptance criterion:
   - create child with 2 guardians → 1 Child, 2 Guardian rows, 2 `User` rows with `loginEnabled=false` & `role=GUARDIAN`; `consentStatus=PENDING`.
   - `child.list` as CLINIC_ADMIN returns only own-clinic children; a second clinic's child absent.
   - assigned THERAPIST `child.get` succeeds; unassigned THERAPIST → `FORBIDDEN`.
   - `checkIntakeComplete` on a freshly created child → `complete:false`, `missingFields` includes `"consent"`.
   - `softDelete` then `child.list` as STAFF hides it; as CLINIC_ADMIN it still appears.
   - `updateMedicalHistory` round-trips all 7 fields on the child record.
   - `assignTherapist` creates a `ChildTherapistAssignment`; `listAssignedChildren` (as that therapist) returns the child; re-calling `assignTherapist` does not duplicate.
   - intake mutation by a user lacking the `child.intake` permission → `FORBIDDEN` (including a CLINIC_ADMIN without the permission row, per decision 2).
