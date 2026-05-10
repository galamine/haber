# Plan: Issue 002 — Tenant, Clinic & Subscription Setup

## Context

The `User` model already has `tenantId` (nullable string, no FK) and it flows through JWTs. This issue formalises multi-tenancy by adding `Clinic` and `SubscriptionPlan` models, wiring the FK, adding all super-admin and clinic-admin API endpoints, enforcing clinic suspension at the auth layer, and building corresponding frontend pages.

**Key decisions (from grilling session):**
- Children served are called **"child"** (future `Child` model; for now only a stored limit field on the plan)
- Subscription is **barebones**: model + CRUD only, no limit enforcement yet
- Suspension enforced **in `auth.ts` middleware** — universal, bypass-proof
- Clinic uses **soft delete** (`deletedAt DateTime?`), not cascade or restrict
- `subscriptionPlanId` is **nullable** on Clinic (subscription design under active discussion)
- Tenant isolation via **explicit service-layer scoping** (pass `tenantId` from controller)
- New permissions: `manageClinics`, `manageSubscriptionPlans`, `getClinic`

---

# PART 1 — BACKEND

---

## B1 — Prisma Schema (`apps/backend/prisma/schema.prisma`)

Add two new enums and two new models, update `User`:

```prisma
enum ClinicStatus {
  active
  suspended
}

enum SubscriptionTier {
  basic
  advanced
  enterprise
}

model SubscriptionPlan {
  id                String           @id @default(uuid())
  name              String
  tier              SubscriptionTier
  maxUsersByRole    Json             @map("max_users_by_role")
  maxSensoryRooms   Int              @map("max_sensory_rooms")
  maxActiveChildren Int              @map("max_active_children")
  featureFlags      Json             @map("feature_flags")
  createdAt         DateTime         @default(now()) @map("created_at")
  updatedAt         DateTime         @updatedAt @map("updated_at")
  clinics           Clinic[]

  @@map("subscription_plans")
}

model Clinic {
  id                 String            @id @default(uuid())
  name               String
  address            String
  contactPhone       String            @map("contact_phone")
  contactEmail       String            @map("contact_email")
  timezone           String
  subscriptionPlanId String?           @map("subscription_plan_id")
  status             ClinicStatus      @default(active)
  deletedAt          DateTime?         @map("deleted_at")
  createdAt          DateTime          @default(now()) @map("created_at")
  updatedAt          DateTime          @updatedAt @map("updated_at")
  subscriptionPlan   SubscriptionPlan? @relation(fields: [subscriptionPlanId], references: [id])
  users              User[]

  @@map("clinics")
}
```

Update `User` — add formal FK relation and index:
```prisma
clinic    Clinic?   @relation(fields: [tenantId], references: [id])
@@index([tenantId])
```

Run: `cd apps/backend && pnpm prisma:migrate && pnpm prisma:generate`

---

## B2 — Shared Package (`packages/shared/src/`)

### B2a — Permissions (`constants/roles.ts`)

```typescript
export const allRoles: Record<UserRole, string[]> = {
  super_admin:  ['getUsers', 'manageUsers', 'manageClinics', 'manageSubscriptionPlans'],
  clinic_admin: ['getUsers', 'manageUsers', 'getClinic'],
  therapist:    ['getUsers'],
  staff:        ['getUsers'],
};
```

### B2b — New Schemas

**`schemas/clinic.schema.ts`** — follow `user.schema.ts` pattern:

`ClinicDtoSchema` fields: `id`, `name`, `address`, `contactPhone`, `contactEmail`, `timezone`, `subscriptionPlanId` (nullable uuid), `status` (`z.enum(['active', 'suspended'])`), `deletedAt` (nullable datetime), `createdAt`, `updatedAt`.

Add `PaginatedClinicsDtoSchema` (same shape as `PaginatedUsersDtoSchema`).

**`schemas/subscriptionPlan.schema.ts`:**

`SubscriptionPlanDtoSchema` fields: `id`, `name`, `tier` (`z.enum(['basic', 'advanced', 'enterprise'])`), `maxUsersByRole` (`z.unknown()`), `maxSensoryRooms` (int), `maxActiveChildren` (int), `featureFlags` (`z.unknown()`), `createdAt`, `updatedAt`.

Add `PaginatedSubscriptionPlansDtoSchema`.

Export inferred TypeScript types from both files.

### B2c — Barrel exports

- `schemas/index.ts`: add `export * from './clinic.schema'` and `export * from './subscriptionPlan.schema'`
- Create `dtos/clinic.dto.ts` and `dtos/subscriptionPlan.dto.ts` — re-export types (same pattern as `user.dto.ts`)
- `dtos/index.ts`: add both new dto files

---

## B3 — Auth Middleware (`apps/backend/src/middlewares/auth.ts`)

Expand the DB select to include clinic status alongside the user:

```typescript
const user = await prisma.user.findUnique({
  where: { id: payload.sub },
  select: {
    id: true, name: true, email: true, role: true, tenantId: true,
    clinic: { select: { status: true, deletedAt: true } },
  },
});

if (user.clinic && (user.clinic.status === 'suspended' || user.clinic.deletedAt !== null)) {
  throw new ApiError(httpStatus.FORBIDDEN, 'CLINIC_SUSPENDED');
}
```

Super admins (`tenantId = null`) have no `clinic` relation — check short-circuits safely.

---

## B4 — SubscriptionPlan Feature

### B4a — Service (`apps/backend/src/services/subscriptionPlan.service.ts`)

- `createSubscriptionPlan(body)` → insert, return DTO shape
- `querySubscriptionPlans({ page, limit })` → paginated list
- `getSubscriptionPlanById(planId)` → single or throw 404
- `updateSubscriptionPlan(planId, body)` → update, return DTO shape

### B4b — Validation (`apps/backend/src/validations/subscriptionPlan.validation.ts`)

- `createBody`: name, tier (enum), maxUsersByRole (object), maxSensoryRooms (int ≥ 0), maxActiveChildren (int ≥ 0), featureFlags (object)
- `updateBody`: all optional, `.refine` at-least-one check
- `params`: `{ planId: z.string().uuid() }`
- `query`: `{ page, limit }` with coerce to int, sensible defaults

### B4c — Controller (`apps/backend/src/controllers/subscriptionPlan.controller.ts`)

Standard `catchAsync` wrappers. `create` returns `httpStatus.CREATED`.

### B4d — Routes (`apps/backend/src/routes/v1/superAdmin.route.ts`)

```
POST   /super-admin/subscription-plans           auth('manageSubscriptionPlans')
GET    /super-admin/subscription-plans           auth('manageSubscriptionPlans')
PATCH  /super-admin/subscription-plans/:planId   auth('manageSubscriptionPlans')
```

---

## B5 — Clinic Feature

### B5a — Service (`apps/backend/src/services/clinic.service.ts`)

- `createClinic(body)` → insert, return DTO
- `queryClinics({ page, limit })` → paginated list, always filter `deletedAt: null`
- `getClinicById(clinicId)` → single or 404, filter `deletedAt: null`
- `updateClinic(clinicId, body)` → update allowed fields
- `suspendClinic(clinicId)` → set `status: 'suspended'`
- `reactivateClinic(clinicId)` → set `status: 'active'`
- `getMyClinic(tenantId)` → fetch own clinic + subscriptionPlan (for clinic_admin)

### B5b — Validation (`apps/backend/src/validations/clinic.validation.ts`)

- `createBody`: name, address, contactPhone, contactEmail, timezone, subscriptionPlanId (optional uuid)
- `updateBody`: all optional, at-least-one refine
- `params`: `{ clinicId: z.string().uuid() }`
- `query`: page + limit

### B5c — Controller (`apps/backend/src/controllers/clinic.controller.ts`)

Standard `catchAsync` wrappers. `getMyClinic` reads `req.user.tenantId`; throws 404 if null.

### B5d — Routes

In `superAdmin.route.ts`:
```
POST   /super-admin/clinics                       auth('manageClinics')
GET    /super-admin/clinics                       auth('manageClinics')
GET    /super-admin/clinics/:clinicId             auth('manageClinics')
PATCH  /super-admin/clinics/:clinicId             auth('manageClinics')
POST   /super-admin/clinics/:clinicId/suspend     auth('manageClinics')
POST   /super-admin/clinics/:clinicId/reactivate  auth('manageClinics')
```

New `apps/backend/src/routes/v1/clinic.route.ts`:
```
GET    /clinic/me    auth('getClinic')
```

---

## B6 — Wire Routes (`apps/backend/src/routes/v1/index.ts`)

```typescript
import superAdminRoute from './superAdmin.route';
import clinicRoute from './clinic.route';

// add to defaultRoutes array:
{ path: '/super-admin', route: superAdminRoute },
{ path: '/clinic',      route: clinicRoute },
```

---

## B7 — Service Barrel (`apps/backend/src/services/index.ts`)

```typescript
export { clinicService } from './clinic.service';
export { subscriptionPlanService } from './subscriptionPlan.service';
```

---

## B8 — Test DB Cleanup (`apps/backend/tests/utils/setupTestDB.ts`)

Cleanup order respects FK constraints — leaf models first:
```typescript
await prisma.otpRecord.deleteMany();
await prisma.token.deleteMany();
await prisma.user.deleteMany();               // references Clinic
await prisma.clinic.deleteMany();             // references SubscriptionPlan
await prisma.subscriptionPlan.deleteMany();
```

---

## B9 — Tests

### `apps/backend/tests/clinic.test.ts`
- Super admin creates clinic → list returns it with `active` status
- Super admin suspends clinic → clinic_admin's next request returns 403 `CLINIC_SUSPENDED`
- Super admin reactivates clinic → clinic_admin requests succeed
- Clinic_admin cannot read another clinic's data (tenant isolation)
- Super admin (`tenantId = null`) can access all clinics
- `GET /clinic/me` returns own clinic with subscriptionPlan embedded

### `apps/backend/tests/subscriptionPlan.test.ts`
- Super admin creates plan → appears in list
- Super admin updates plan → changes reflected
- Non-super-admin cannot access plan routes (403)

---

## Backend Critical Files

| Action | File |
|--------|------|
| Modify | `apps/backend/prisma/schema.prisma` |
| Modify | `packages/shared/src/constants/roles.ts` |
| Create | `packages/shared/src/schemas/clinic.schema.ts` |
| Create | `packages/shared/src/schemas/subscriptionPlan.schema.ts` |
| Modify | `packages/shared/src/schemas/index.ts` |
| Create | `packages/shared/src/dtos/clinic.dto.ts` |
| Create | `packages/shared/src/dtos/subscriptionPlan.dto.ts` |
| Modify | `packages/shared/src/dtos/index.ts` |
| Modify | `apps/backend/src/middlewares/auth.ts` |
| Create | `apps/backend/src/services/clinic.service.ts` |
| Create | `apps/backend/src/services/subscriptionPlan.service.ts` |
| Modify | `apps/backend/src/services/index.ts` |
| Create | `apps/backend/src/validations/clinic.validation.ts` |
| Create | `apps/backend/src/validations/subscriptionPlan.validation.ts` |
| Create | `apps/backend/src/controllers/clinic.controller.ts` |
| Create | `apps/backend/src/controllers/subscriptionPlan.controller.ts` |
| Create | `apps/backend/src/routes/v1/superAdmin.route.ts` |
| Create | `apps/backend/src/routes/v1/clinic.route.ts` |
| Modify | `apps/backend/src/routes/v1/index.ts` |
| Modify | `apps/backend/tests/utils/setupTestDB.ts` |
| Create | `apps/backend/tests/clinic.test.ts` |
| Create | `apps/backend/tests/subscriptionPlan.test.ts` |

---

## Backend Verification

```bash
pnpm build:shared
cd apps/backend && pnpm prisma:migrate && pnpm prisma:generate
pnpm test
pnpm lint
```

---

---

# PART 2 — FRONTEND

> Start only after backend tests pass.

---

## F1 — API Layer

### `apps/frontend/src/api/clinics.ts`

Follow the pattern in `api/users.ts`. Use `apiClient` from `api/client.ts`.

```typescript
export const clinicsApi = {
  getClinics:      (params?) => apiClient.get<PaginatedClinicsDto>('/v1/super-admin/clinics', { params }),
  getClinic:       (id)      => apiClient.get<ClinicDto>(`/v1/super-admin/clinics/${id}`),
  createClinic:    (body)    => apiClient.post<ClinicDto>('/v1/super-admin/clinics', body),
  updateClinic:    (id, body)=> apiClient.patch<ClinicDto>(`/v1/super-admin/clinics/${id}`, body),
  suspendClinic:   (id)      => apiClient.post<ClinicDto>(`/v1/super-admin/clinics/${id}/suspend`, {}),
  reactivateClinic:(id)      => apiClient.post<ClinicDto>(`/v1/super-admin/clinics/${id}/reactivate`, {}),
  getMyClinic:     ()        => apiClient.get<ClinicDto>('/v1/clinic/me'),
};
```

### `apps/frontend/src/api/subscriptionPlans.ts`

```typescript
export const subscriptionPlansApi = {
  getPlans:   (params?) => apiClient.get<PaginatedSubscriptionPlansDto>('/v1/super-admin/subscription-plans', { params }),
  createPlan: (body)    => apiClient.post<SubscriptionPlanDto>('/v1/super-admin/subscription-plans', body),
  updatePlan: (id, body)=> apiClient.patch<SubscriptionPlanDto>(`/v1/super-admin/subscription-plans/${id}`, body),
};
```

---

## F2 — TanStack Query Hooks

### `apps/frontend/src/hooks/useClinics.ts`

Follow `hooks/useUsers.ts` pattern — query key factory + `useQuery` / `useMutation`:

- `useClinics(params?)` — paginated list
- `useClinic(clinicId)` — single detail, `enabled: !!clinicId`
- `useMyClinic()` — `GET /clinic/me`, for clinic_admin
- `useCreateClinic()` — mutation, invalidates list on success
- `useUpdateClinic()` — mutation, updates detail cache + invalidates list
- `useSuspendClinic()` — mutation, invalidates list + detail
- `useReactivateClinic()` — mutation, invalidates list + detail

### `apps/frontend/src/hooks/useSubscriptionPlans.ts`

- `useSubscriptionPlans(params?)` — paginated list
- `useCreateSubscriptionPlan()` — mutation, invalidates list
- `useUpdateSubscriptionPlan()` — mutation, invalidates list

---

## F3 — Pages

### F3a — Clinic List (`pages/super-admin/clinics/ClinicListPage.tsx`)

- Table columns: **Name**, **Tier** (badge), **Status** (badge: green `active` / red `suspended`), **Actions** dropdown
- Actions per row: Edit (links to form), Suspend / Reactivate (confirmation dialog before mutating)
- Pagination controls using query params
- "New Clinic" button → opens `ClinicFormPage` in create mode
- Uses `useClinics()` hook; loading state via skeleton rows

### F3b — Clinic Form (`pages/super-admin/clinics/ClinicFormPage.tsx`)

Shared create/edit form — detect mode from presence of `clinicId` param.

Fields:
- Name (text input)
- Address (textarea)
- Contact Phone (text input)
- Contact Email (email input)
- Timezone (select — populate with common IANA timezone list)
- Subscription Plan (select from `useSubscriptionPlans()` results; optional, shows "None" option)

On submit: `useCreateClinic()` or `useUpdateClinic()` → navigate back to list on success.

### F3c — Subscription Plan List (`pages/super-admin/subscription-plans/SubscriptionPlanListPage.tsx`)

- Table columns: **Name**, **Tier**, **Max Children**, **Max Sensory Rooms**, **Actions**
- Actions: Edit → opens `SubscriptionPlanFormPage`
- "New Plan" button → create mode form
- Uses `useSubscriptionPlans()` hook

### F3d — Subscription Plan Form (`pages/super-admin/subscription-plans/SubscriptionPlanFormPage.tsx`)

Fields:
- Name (text input)
- Tier (select: basic / advanced / enterprise)
- Max Active Children (number input)
- Max Sensory Rooms (number input)
- Max Users by Role (three number inputs: doctor, therapist, staff)
- Feature Flags (two toggles: SMS Notifications, Per-Tenant Branding)

On submit: `useCreateSubscriptionPlan()` or `useUpdateSubscriptionPlan()`.

### F3e — My Clinic (`pages/clinic/MyClinicPage.tsx`)

Clinic admin view. Uses `useMyClinic()`.

Sections:
- **Clinic Info**: name, address, contact details, timezone
- **Plan**: tier badge, plan name (or "No plan assigned")
- **Limits** (from `subscriptionPlan` if present): Max Children, Max Sensory Rooms, max users by role — displayed as static numbers (no usage counters yet; `Child` model not built)
- **Feature Flags**: read-only toggle display (SMS Notifications, Per-Tenant Branding)

---

## F4 — Routing (`apps/frontend/src/App.tsx`)

Add inside the authenticated route tree:

```tsx
// Super admin only
<Route path="/super-admin/clinics" element={
  <ProtectedRoute requiredRoles={['super_admin']}>
    <ClinicListPage />
  </ProtectedRoute>
} />
<Route path="/super-admin/clinics/new" element={
  <ProtectedRoute requiredRoles={['super_admin']}>
    <ClinicFormPage />
  </ProtectedRoute>
} />
<Route path="/super-admin/clinics/:clinicId/edit" element={
  <ProtectedRoute requiredRoles={['super_admin']}>
    <ClinicFormPage />
  </ProtectedRoute>
} />
<Route path="/super-admin/subscription-plans" element={
  <ProtectedRoute requiredRoles={['super_admin']}>
    <SubscriptionPlanListPage />
  </ProtectedRoute>
} />
<Route path="/super-admin/subscription-plans/new" element={
  <ProtectedRoute requiredRoles={['super_admin']}>
    <SubscriptionPlanFormPage />
  </ProtectedRoute>
} />
<Route path="/super-admin/subscription-plans/:planId/edit" element={
  <ProtectedRoute requiredRoles={['super_admin']}>
    <SubscriptionPlanFormPage />
  </ProtectedRoute>
} />

// Clinic admin only
<Route path="/clinic/me" element={
  <ProtectedRoute requiredRoles={['clinic_admin']}>
    <MyClinicPage />
  </ProtectedRoute>
} />
```

---

## F5 — Navigation (`apps/frontend/src/components/shell/MainSidebar.tsx`)

Add role-gated nav items:

- **Super admin**: "Clinics" link → `/super-admin/clinics`; "Subscription Plans" link → `/super-admin/subscription-plans`
- **Clinic admin**: "My Clinic" link → `/clinic/me`

Use the existing `isAdmin` role detection pattern already in `PageShell.tsx`.

---

## Frontend Critical Files

| Action | File |
|--------|------|
| Create | `apps/frontend/src/api/clinics.ts` |
| Create | `apps/frontend/src/api/subscriptionPlans.ts` |
| Create | `apps/frontend/src/hooks/useClinics.ts` |
| Create | `apps/frontend/src/hooks/useSubscriptionPlans.ts` |
| Create | `apps/frontend/src/pages/super-admin/clinics/ClinicListPage.tsx` |
| Create | `apps/frontend/src/pages/super-admin/clinics/ClinicFormPage.tsx` |
| Create | `apps/frontend/src/pages/super-admin/subscription-plans/SubscriptionPlanListPage.tsx` |
| Create | `apps/frontend/src/pages/super-admin/subscription-plans/SubscriptionPlanFormPage.tsx` |
| Create | `apps/frontend/src/pages/clinic/MyClinicPage.tsx` |
| Modify | `apps/frontend/src/App.tsx` |
| Modify | `apps/frontend/src/components/shell/MainSidebar.tsx` |

---

## Frontend Verification

```bash
pnpm build:shared && pnpm dev
```

Manual smoke-test (requires backend running):
1. Log in as `super_admin` → sidebar shows "Clinics" and "Subscription Plans"
2. Create a subscription plan → appears in list
3. Create a clinic, assign the plan → appears in clinic list with `active` status
4. Click "Suspend" on the clinic → status badge turns red; log in as that clinic's `clinic_admin` → see suspension error
5. Reactivate → clinic admin access restored
6. Log in as `clinic_admin` → sidebar shows "My Clinic" → page shows plan tier + limits
7. Log in as `therapist` → neither "Clinics" nor "My Clinic" nav items appear
