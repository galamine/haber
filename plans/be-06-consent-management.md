# BE-06: Consent Management API (DPDP)

## Context

Guardian consent is a hard compliance gate (DPDP): no assessment or treatment plan may start
for a child until **all** of the child's guardians have given TREATMENT consent. BE-05 already
built the entire data layer for this — `ConsentRecord`, `ConsentType`, `ConsentStatus`,
`Child.consentStatus`, and `TherapySession.blockedByConsent` all exist in
`packages/db/prisma/schema/clinical.prisma` and `sessions.prisma`. **No schema changes or
migrations are required.** BE-06 is purely the API layer: a new `consent` tRPC router exposing
`record`, `getStatus`, `withdraw`, `restore`, plus capturing the request IP server-side for the
audit trail.

This plan reflects four decisions confirmed with the user:
1. **IP comes from the server context**, not client input (audit integrity; drop `ip` from input).
2. **`restore` flips status only** — it does NOT write a new `ConsentRecord`; it re-checks the
   existing TREATMENT records and, if still unanimous, sets `GRANTED` and unblocks sessions.
3. **`consent.record` only promotes `PENDING → GRANTED`**, never `WITHDRAWN → GRANTED`
   (restore is the sole admin-gated path out of withdrawal).
4. **"Future" sessions = `status = PENDING` AND `scheduledDate >= now`** for block/unblock.

## Existing facts (verified)

- Base procedures in `packages/api/src/index.ts`: `protectedProcedure` (enforces auth),
  `adminProcedure` (SUPER_ADMIN), `clinicAdminProcedure` (CLINIC_ADMIN). `hasPermission(ctx, perm)`
  helper + `PERMISSIONS.CHILD_INTAKE = "child.intake"` (`schemas/staff.ts`).
- Roles: `SUPER_ADMIN | CLINIC_ADMIN | THERAPIST | STAFF | GUARDIAN`.
- Context built in `packages/api/src/context.ts` from a Hono context; returns `{ auth, session }`.
  Middlewares spread `...ctx`, so any new field flows to procedures.
- `child.ts` already has helpers `getChildForRead(childId, ctx)` (enforces clinic + therapist/staff
  assignment access, returns child incl. `guards`) and `assertChildInClinic(childId, tenantId)` —
  both currently **not exported**.
- Guardians link to a child via `Guardian.childId` (one-to-many); `Child.guards` and
  `Guardian.consentRecords` relations exist. `ConsentRecord` fields: `childId, guardianId,
  consentType, typedName, checkbox, timestamp (@default now), ip`.
- No test framework exists in the repo — verification is `pnpm check-types` + manual.

## Files to change

### 1. `packages/api/src/context.ts` — capture IP
Extract client IP and return it on the context:
- Prefer proxy header: `context.req.header("x-forwarded-for")?.split(",")[0].trim()`,
  then `context.req.header("x-real-ip")`, then `getConnInfo(context).remote.address`
  (`import { getConnInfo } from "@hono/node-server/conninfo"`), else `"unknown"`.
- Return `{ auth, session: null, ip }`. (If the `conninfo` subpath export is unavailable in the
  installed `@hono/node-server`, fall back to the header-only chain — verify during implementation.)
- `ctx.ip` is now readable in every procedure; `Context` type updates automatically.

### 2. `packages/api/src/schemas/consent.ts` — NEW shared schemas
Follow the `schemas/child.ts` Zod pattern (`<Op>Input` naming). Add:
- `ConsentTypeSchema = z.enum(["TREATMENT", "DATA_PROCESSING", "IMAGE_VIDEO_CAPTURE"])`
- `RecordConsentInput = { childId, guardianId, consentType: ConsentTypeSchema, typedName: z.string().min(1), checkbox: z.literal(true) }` — **no `ip`** (server-derived).
- `WithdrawConsentInput = { childId, guardianId, reason: z.string().optional() }`
- `RestoreConsentInput = { childId, guardianId }`
- Output types for documentation/inference: `ConsentRecordSchema` (mirror of the model) and
  `ConsentStatusSummarySchema` = `{ status: ConsentStatusSchema, guardians: GuardianConsentSummary[] }`
  where each summary = `{ guardianId, name, relation, consents: { TREATMENT, DATA_PROCESSING, IMAGE_VIDEO_CAPTURE } }`
  and each entry = `{ consented: boolean, typedName: string | null, timestamp: Date | null }`.

### 3. `packages/api/src/routers/child.ts` — export 2 helpers for reuse
Add `export` to the existing `getChildForRead` and `assertChildInClinic` (no logic change) so
`consent.ts` reuses them instead of duplicating access logic.

### 4. `packages/api/src/routers/consent.ts` — NEW router
Imports: `prisma`, `TRPCError`, `z`, `AuthUser`, `{ hasPermission, protectedProcedure, router }`
from `../index`, the consent schemas, `PERMISSIONS` from `../schemas/staff`, and
`{ getChildForRead, assertChildInClinic }` from `./child`.

Local helpers:
- `requireIntakePermission(ctx)` — `hasPermission(ctx, PERMISSIONS.CHILD_INTAKE)` else `FORBIDDEN`
  (same as child.ts).
- `assertGuardianOfChild(guardianId, childId)` — `prisma.guardian.findFirst`; `NOT_FOUND` if absent.
- `isUnanimousTreatmentConsent(childId)`: single query —
  `prisma.child.findUnique({ where:{id}, include:{ guards:{ include:{ consentRecords:{ where:{ consentType:"TREATMENT", checkbox:true }, select:{id:true} } } } } })`;
  return `child.guards.length > 0 && child.guards.every(g => g.consentRecords.length > 0)`.
- `assertChildAdmin(childId, ctx)` — for withdraw/restore: require `role === CLINIC_ADMIN || SUPER_ADMIN`
  (else `FORBIDDEN`), then locate child scoped by clinic for CLINIC_ADMIN / unscoped for SUPER_ADMIN
  (mirror `child.ts` `softDelete`); `NOT_FOUND` if absent. Returns the child.
- **Exported** `assertConsentGranted(childId)` — throws `PRECONDITION_FAILED` if
  `child.consentStatus !== "GRANTED"`. Provided now for `assessment.create` / `treatment_plan.start`
  (BE-07+) to import; not called within this router.

Procedures (`record` and `withdraw`/`restore` wrapped in `prisma.$transaction`):

- **`record`** = `protectedProcedure.input(RecordConsentInput).mutation`:
  1. `requireIntakePermission(ctx)`; `assertChildInClinic(childId, ctx.auth.tenantId!)`;
     `assertGuardianOfChild`.
  2. In a transaction: create `ConsentRecord` with `ip: ctx.ip`.
  3. If `consentType === "TREATMENT"`: re-read `child.consentStatus`; **only if it is `PENDING`**
     and `isUnanimousTreatmentConsent` → update `consentStatus = "GRANTED"`. (Never touches a
     `WITHDRAWN` child — decision 3.)
  4. Return the created record.

- **`getStatus`** = `protectedProcedure.input({ childId }).query`:
  1. `getChildForRead(childId, ctx)` (reused — enforces clinic + assigned-therapist/staff access;
     admins pass).
  2. Load `prisma.guardian.findMany({ where:{childId}, include:{ consentRecords:{ orderBy:{ timestamp:"desc" } } } })`.
  3. For each guardian, for each of the 3 types, take the latest record: `consented = checkbox === true`,
     plus `typedName`/`timestamp` (null if none). Return `{ status: child.consentStatus, guardians }`.

- **`withdraw`** = `protectedProcedure.input(WithdrawConsentInput).mutation`:
  1. `assertChildAdmin(childId, ctx)` (CLINIC_ADMIN/SUPER_ADMIN only → therapist gets `FORBIDDEN`);
     `assertGuardianOfChild`.
  2. In a transaction: `child.update consentStatus = "WITHDRAWN"`; then
     `therapySession.updateMany({ where:{ childId, status:"PENDING", scheduledDate:{ gte: new Date() } }, data:{ blockedByConsent: true } })`.
  3. Return void. (`reason` is accepted but not persisted — no column exists; note for follow-up.)

- **`restore`** = `protectedProcedure.input(RestoreConsentInput).mutation`:
  1. `assertChildAdmin(childId, ctx)`; `assertGuardianOfChild`.
  2. In a transaction: if `isUnanimousTreatmentConsent(childId)` → set `consentStatus = "GRANTED"`
     and `therapySession.updateMany({ where:{ childId, status:"PENDING", scheduledDate:{ gte: new Date() } }, data:{ blockedByConsent: false } })`.
     Else → set `consentStatus = "PENDING"` and leave sessions blocked (records incomplete).
     **No new `ConsentRecord` is written** (decision 2).
  3. Return void.

### 5. `packages/api/src/routers/index.ts` — register
Import `consentRouter` and add `consent: consentRouter` to `appRouter`.

## Out of scope (documented for later issues)
- `assessment.create` / `treatment_plan.start` calling `assertConsentGranted` and the
  `PRECONDITION_FAILED` behavior are BE-07+ (acceptance criterion #8 is "tested in BE-07"). This
  plan only ships the reusable `assertConsentGranted` helper.
- Persisting the withdrawal `reason` (no DB column today).

## Verification
1. `pnpm db:generate` (regenerate client; no schema change, but ensures types are current) then
   `pnpm check-types` — must pass.
2. `pnpm check` — Biome (tabs, double quotes) clean.
3. Manual end-to-end via `pnpm dev:server` (tRPC), using a CLINIC_ADMIN/intake token and a 2-guardian
   child created through `child.create`:
   - `consent.record` TREATMENT for guardian A → `getStatus.status` stays `PENDING`.
   - `consent.record` TREATMENT for guardian B → status flips to `GRANTED`.
   - `consent.withdraw` → status `WITHDRAWN`; future PENDING sessions show `blockedByConsent = true`
     (verify in `pnpm db:studio`).
   - `consent.restore` → status `GRANTED`; those sessions `blockedByConsent = false`.
   - `consent.getStatus` → per-guardian breakdown across all three consent types.
   - Call `consent.withdraw` with a THERAPIST token → `FORBIDDEN`.
   - Inspect a recorded `ConsentRecord` row → `ip` is populated from the request, not the input.
