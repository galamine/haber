# Plan: Issue 003 — Staff Management

## Context

Clinic admins need to invite, manage, and deactivate clinical staff (therapists and general staff). This issue adds the invite-via-OTP flow, granular per-user permissions on top of role defaults, isActive-based deactivation, and subscription plan capacity enforcement. Blocked by issues 001 and 002, both complete.

## Design Decisions

- **"Doctor" role** → does not exist; treat as `therapist`. Update issue MD file references.
- **StaffPermission** → additive extra rights on top of `roleRights[user.role]`. Auth checks base rights + staff permissions.
- **Route namespace** → new `/staff/*` router; existing `/users` has no tenant scoping and stays untouched.
- **Invite acceptance** → extend `POST /auth/verify-otp`: if `OtpRecord.type === 'invite'`, set `isActive: true` atomically in the same transaction before issuing tokens.
- **Capacity enforcement** → counts ALL users of that role in the clinic (isActive true AND false), preventing invite-spam exploits.
- **isActive check** → in `config/passport.ts` alongside the existing clinic suspension check. Returns `USER_DEACTIVATED` → 401.
- **PATCH /staff/:userId** → updates `permissions` + `departmentIds` only. Role is immutable after invite.
- **Invite email** → new `sendInviteEmail(to, clinicName, role, otp)` in `email.service.ts`.
- **Invitable roles** → `clinic_admin` may only invite `[therapist, staff]`. Cannot create new admins.
- **Frontend** → full stack: all 4 UI components included.

---

## Phase 1 — Schema & Migrations

**File:** `apps/backend/prisma/schema.prisma`

### Add to User model
```prisma
isActive        Boolean  @default(true)  @map("is_active")
invitedByUserId String?  @map("invited_by_user_id")
departmentIds   Json     @default("[]")  @map("department_ids")
invitedBy       User?    @relation("InvitedBy", fields: [invitedByUserId], references: [id])
invitedUsers    User[]   @relation("InvitedBy")
staffPermission StaffPermission?
```

### New model
```prisma
model StaffPermission {
  id          String   @id @default(uuid())
  userId      String   @unique @map("user_id")
  permissions Json     @default("[]")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt       @map("updated_at")
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@map("staff_permissions")
}
```

**Command:** `cd apps/backend && pnpm prisma:migrate` (migration name: `add_staff_management`)

---

## Phase 2 — Auth Middleware: isActive enforcement

**File:** `apps/backend/src/config/passport.ts`

After the existing clinic suspension check, add:
```typescript
if (!user.isActive) {
  return done(new Error('USER_DEACTIVATED'), false);
}
```

**File:** `apps/backend/src/middlewares/auth.ts`

In the Passport authenticate callback, handle `USER_DEACTIVATED` error → `throw new ApiError(httpStatus.UNAUTHORIZED, 'USER_DEACTIVATED')`.

---

## Phase 3 — OTP Service: invite acceptance branch

**File:** `apps/backend/src/services/otp.service.ts`

In `verifyOtp(email, otp, tx?)`, after successful OTP validation:
```typescript
if (otpRecord.type === 'invite') {
  await (tx ?? prisma).user.update({
    where: { id: user.id },
    data: { isActive: true },
  });
}
```
Runs inside the same transaction as the OTP `usedAt` stamp.

---

## Phase 4 — Shared Package: Staff schemas & DTOs

**File:** `packages/shared/src/schemas/staff.schema.ts` (new)

```typescript
InviteStaffDtoSchema: {
  email: z.string().email(),
  role: z.enum(['therapist', 'staff']),
  permissions: z.string().array().default([]),
  departmentIds: z.string().uuid().array().default([])
}
UpdateStaffDtoSchema: {
  permissions?: z.string().array(),
  departmentIds?: z.string().uuid().array()
}
StaffDtoSchema: { id, name, email, role, isActive, permissions, departmentIds, createdAt }
CapacityEntrySchema: { role: string, active: number, total: number, limit: number | null }
```

Export from `packages/shared/src/dtos/staff.dto.ts` and re-export from `packages/shared/src/index.ts`.

---

## Phase 5 — Email Service: invite template

**File:** `apps/backend/src/services/email.service.ts`

Add:
```typescript
sendInviteEmail(to: string, clinicName: string, role: string, otp: string): Promise<void>
```
HTML template: "You've been invited to join [Clinic Name] as a [Role]. Your one-time code is **XXXXXX**. It expires in 10 minutes."

---

## Phase 6 — Staff Service

**File:** `apps/backend/src/services/staff.service.ts` (new)

| Method | Description |
|--------|-------------|
| `inviteStaff(inviterId, tenantId, body)` | Enforce capacity → create user (`isActive:false`, `tenantId`, `invitedByUserId`) → create `OtpRecord(type:'invite')` → `sendInviteEmail`. All in one transaction. |
| `queryStaff(tenantId, filter, options)` | Paginated, filtered by `tenantId`. Include `staffPermission`. |
| `getStaffById(tenantId, userId)` | Tenant-scoped single fetch. |
| `updateStaff(tenantId, userId, body)` | Upsert `StaffPermission`; update `departmentIds` on User. |
| `deactivateStaff(tenantId, userId)` | Set `isActive: false`. |
| `reactivateStaff(tenantId, userId)` | Set `isActive: true`. |
| `getCapacity(tenantId)` | For each role in `[therapist, staff]`: count users in clinic + look up plan limit from `clinic.subscriptionPlan.maxUsersByRole`. |

**Capacity enforcement inside `inviteStaff`:**
```typescript
const count = await tx.user.count({ where: { tenantId, role: body.role } });
const limit = clinic.subscriptionPlan?.maxUsersByRole?.[body.role] ?? Infinity;
if (count >= limit) throw new ApiError(422, 'PLAN_LIMIT_EXCEEDED');
```

Barrel-export from `services/index.ts`.

---

## Phase 7 — Validations

**File:** `apps/backend/src/validations/staff.validation.ts` (new)

- `inviteStaff`: body = `InviteStaffDtoSchema`
- `updateStaff`: params = `{ userId: z.string().uuid() }`, body = `UpdateStaffDtoSchema`
- `staffUserId`: params = `{ userId: z.string().uuid() }`

---

## Phase 8 — Controller & Routes

**File:** `apps/backend/src/controllers/staff.controller.ts` (new)

All handlers `catchAsync`-wrapped. Extract `req.user.id` and `req.user.tenantId` for tenant isolation.

**File:** `apps/backend/src/routes/v1/staff.route.ts` (new)

```
POST   /staff/invite              auth('manageUsers')  validate(inviteStaff)   → inviteStaff
GET    /staff                     auth('manageUsers')                           → getStaff
GET    /staff/capacity            auth('manageUsers')                           → getCapacity
GET    /staff/:userId             auth('manageUsers')  validate(staffUserId)   → getStaffById
PATCH  /staff/:userId             auth('manageUsers')  validate(updateStaff)   → updateStaff
POST   /staff/:userId/deactivate  auth('manageUsers')  validate(staffUserId)   → deactivateStaff
POST   /staff/:userId/reactivate  auth('manageUsers')  validate(staffUserId)   → reactivateStaff
```

**File:** `apps/backend/src/routes/v1/index.ts`

Add: `router.use('/staff', staffRoute)`

---

## Phase 9 — Frontend

### API client
**File:** `apps/frontend/src/api/staff.ts` (new)

Functions: `inviteStaff`, `getStaff`, `getStaffById`, `updateStaff`, `deactivateStaff`, `reactivateStaff`, `getCapacity`

### TanStack Query hooks
**File:** `apps/frontend/src/hooks/useStaff.ts` (new)

Hooks: `useStaff(filter)`, `useStaffMember(userId)`, `useStaffCapacity()`, `useInviteStaff()`, `useUpdateStaff()`, `useDeactivateStaff()`, `useReactivateStaff()`

### Components

| File | Description |
|------|-------------|
| `apps/frontend/src/components/CapacityWidget.tsx` | Pills: "Therapists: 3/5", "Staff: 2/5" |
| `apps/frontend/src/components/InviteStaffModal.tsx` | Email input, role selector (`therapist`/`staff`), permission checkboxes grouped by resource, department multi-select |
| `apps/frontend/src/pages/StaffPage.tsx` | Table with name, role, permissions count, departments, active status; CapacityWidget at top; deactivated rows greyed with badge; Invite button |
| `apps/frontend/src/pages/StaffDetailPage.tsx` | Full permissions list with inline toggle per permission; shows departmentIds |

### Routing
**File:** `apps/frontend/src/App.tsx`

Add protected routes (clinic_admin only):
- `/staff` → `StaffPage`
- `/staff/:userId` → `StaffDetailPage`

---

## Phase 10 — Tests

**File:** `apps/backend/tests/integration/staff.test.ts` (new)

**New fixtures:**
- `tests/fixtures/staffPermission.fixture.ts`
- Extend `tests/fixtures/user.fixture.ts` with `clinicAdmin`, `therapistUser`, `staffUser` (with `tenantId`, `isActive`)
- Ensure `tests/fixtures/clinic.fixture.ts` has a plan with `maxUsersByRole: { therapist: 5, staff: 5 }`

**Test cases:**
1. `POST /staff/invite` — clinic_admin invites therapist → `OtpRecord` created with `type:'invite'`, user `isActive:false`
2. Invited user calls `POST /auth/verify-otp` with invite OTP → `isActive` set to `true`, tokens returned
3. Inviting 6th therapist when plan limit is 5 → 422 `PLAN_LIMIT_EXCEEDED`
4. Deactivated user's JWT rejected → 401 `USER_DEACTIVATED`
5. Clinic A admin cannot list/edit Clinic B staff → 403 or empty result
6. Therapist with `student.intake` permission can reach intake API; without it → 403

**File:** `apps/backend/tests/utils/setupTestDB.ts`

Add `staffPermission` to the table-clear list between tests.

---

## Phase 11 — Misc cleanup

- Update `issues/003-staff-management.md`: replace "Doctor" → "Therapist", update capacity widget copy

---

## Verification

```bash
# Migrate DB
cd apps/backend && pnpm prisma:migrate

# Run all tests
pnpm test

# Lint
pnpm lint

# Start dev server and manually:
# 1. Log in as clinic_admin → /staff → verify CapacityWidget
# 2. Invite Staff → email, role=Therapist, permissions → send
# 3. Enter OTP from invite email → verify JWT issued + isActive: true
# 4. Deactivate → try login → verify 401 USER_DEACTIVATED
# 5. Reactivate → verify login works
# 6. As Clinic B admin → GET /staff → verify no Clinic A users
pnpm dev
```

---

## Critical Files

| File | Action |
|------|--------|
| `apps/backend/prisma/schema.prisma` | Add `isActive`, `invitedByUserId`, `departmentIds` to User; add `StaffPermission` model |
| `apps/backend/src/config/passport.ts` | Add `isActive` check → `USER_DEACTIVATED` |
| `apps/backend/src/middlewares/auth.ts` | Handle `USER_DEACTIVATED` → 401 |
| `apps/backend/src/services/otp.service.ts` | Add invite branch in `verifyOtp` |
| `apps/backend/src/services/email.service.ts` | Add `sendInviteEmail` |
| `apps/backend/src/services/staff.service.ts` | New — all staff business logic |
| `apps/backend/src/services/index.ts` | Barrel-export `staffService` |
| `apps/backend/src/controllers/staff.controller.ts` | New |
| `apps/backend/src/routes/v1/staff.route.ts` | New |
| `apps/backend/src/routes/v1/index.ts` | Mount `/staff` router |
| `apps/backend/src/validations/staff.validation.ts` | New |
| `packages/shared/src/schemas/staff.schema.ts` | New |
| `packages/shared/src/dtos/staff.dto.ts` | New |
| `apps/frontend/src/api/staff.ts` | New |
| `apps/frontend/src/hooks/useStaff.ts` | New |
| `apps/frontend/src/components/CapacityWidget.tsx` | New |
| `apps/frontend/src/components/InviteStaffModal.tsx` | New |
| `apps/frontend/src/pages/StaffPage.tsx` | New |
| `apps/frontend/src/pages/StaffDetailPage.tsx` | New |
| `apps/frontend/src/App.tsx` | Add `/staff` routes |
| `apps/backend/tests/integration/staff.test.ts` | New |
| `apps/backend/tests/utils/setupTestDB.ts` | Clear `staffPermission` table |
| `issues/003-staff-management.md` | Replace Doctor → Therapist |
