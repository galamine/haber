# Plan: Issue 004 — Departments & Sensory Rooms

## Context
Clinic Admins need to organise staff into Departments and manage physical SensoryRooms where therapy sessions happen. Game library entries also need per-clinic enable/disable toggles. This feature is the first to introduce multi-record clinic-scoped resources (beyond Users), so it establishes the pattern for scoped CRUD + subscription-limit enforcement that later issues will reuse.

## Decisions locked in (from grill session)
| Decision | Choice |
|---|---|
| Game FK (missing issue 014) | Stub a minimal `Game` model now so `ClinicGameToggle` has a real FK |
| Dept delete guard | ANY room assigned → 422 `DEPARTMENT_HAS_ROOMS` (not just active) |
| "doctor" role in spec | Means `therapist`; fix the issue file as part of implementation |
| Room capacity cap | `POST /sensory-rooms` enforces `maxSensoryRooms` → 422 `SENSORY_ROOM_LIMIT_REACHED` |
| Frontend route | New `/clinic/setup` tabbed page (Departments / Sensory Rooms / Game Library) |
| User-Dept relation | Migrate `departmentIds` JSON → proper `UserDepartment` join table |
| Equipment input | Custom keyboard-driven tag input (Enter/comma adds chip) |

---

## Build sequence

### Step 1 — Schema migration
**File:** `apps/backend/prisma/schema.prisma`

Add new enum:
```prisma
enum RoomStatus { active maintenance }
```

Add new models (in dependency order):
```
Game          — id, name, description, createdAt, updatedAt
Department    — id, tenantId (FK Clinic), name, headUserId (nullable FK User),
                description?, createdAt, updatedAt
                @@index([tenantId])
UserDepartment — userId (FK User), departmentId (FK Department)
                 @@id([userId, departmentId])
SensoryRoom   — id, tenantId (FK Clinic), name, code, departmentId?,
                equipmentList Json @default("[]"), status RoomStatus @default(active),
                createdAt, updatedAt
                @@unique([tenantId, code])   ← clinic-scoped uniqueness
                @@index([tenantId])
ClinicGameToggle — id, tenantId (FK Clinic), gameId (FK Game), enabled Boolean @default(true),
                   updatedAt
                   @@unique([tenantId, gameId])
```

Remove from `User`: `departmentIds Json @default("[]") @map("department_ids")`

Add back-relations on Clinic, User, Department as needed.

---

### Step 2 — Role rights
**File:** `packages/shared/src/constants/roles.ts`

```typescript
clinic_admin: [
  'getUsers', 'manageUsers', 'getClinic',
  'manageDepartments', 'getDepartments',
  'manageRooms', 'getRooms',
  'manageGameToggles', 'getGameToggles',
],
therapist: ['getUsers', 'getDepartments', 'getRooms'],
staff:     ['getUsers'],
```

---

### Step 3 — Shared schemas + DTOs
New files in `packages/shared/src/schemas/`:
- `department.schema.ts` — `CreateDepartmentDtoSchema` (name, headUserId?, description?), `UpdateDepartmentDtoSchema` (all optional)
- `sensoryRoom.schema.ts` — `CreateSensoryRoomDtoSchema` (name, code, departmentId?, equipmentList, status), `UpdateSensoryRoomDtoSchema`
- `gameToggle.schema.ts` — `UpdateGameToggleDtoSchema` ({ gameId, enabled })

Export from `packages/shared/src/schemas/index.ts`.

---

### Step 4 — Backend: Departments
**Route:** `apps/backend/src/routes/v1/department.route.ts`
```
POST   /departments           auth('manageDepartments') → validate → controller.create
GET    /departments           auth('getDepartments')    → validate → controller.list
PATCH  /departments/:id       auth('manageDepartments') → validate → controller.update
DELETE /departments/:id       auth('manageDepartments') → validate → controller.remove
```

**Service:** `apps/backend/src/services/department.service.ts`
- All queries scoped by `tenantId` from `req.user`
- `create`: insert Department
- `list`: findMany where tenantId
- `update`: findFirst `{ id, tenantId }` → 404 if missing → update
- `remove`: check `SensoryRoom.count({ where: { departmentId: id } }) > 0` → 422 `DEPARTMENT_HAS_ROOMS`; else delete

Mount at `{ path: '/departments', route: departmentRoute }` in `apps/backend/src/routes/v1/index.ts`.

---

### Step 5 — Backend: Sensory Rooms
**Route:** `apps/backend/src/routes/v1/sensoryRoom.route.ts`
```
POST   /sensory-rooms          auth('manageRooms')  → validate → controller.create
GET    /sensory-rooms          auth('getRooms')      → validate → controller.list
GET    /sensory-rooms/:id      auth('getRooms')      → validate → controller.getOne
PATCH  /sensory-rooms/:id      auth('manageRooms')   → validate → controller.update
DELETE /sensory-rooms/:id      auth('manageRooms')   → validate → controller.remove
```

**Service:** `apps/backend/src/services/sensoryRoom.service.ts`
- `create`: load `clinic.subscriptionPlan.maxSensoryRooms` → count → 422 `SENSORY_ROOM_LIMIT_REACHED` if at cap → check code uniqueness → insert
- `list`: findMany with optional `?status=active|maintenance` filter
- `getOne`: findFirst `{ id, tenantId }` → 404 if missing
- `update`: scope check → re-check code uniqueness if code changed → update
- `remove`: scope check → delete

Mount at `{ path: '/sensory-rooms', route: sensoryRoomRoute }`.

---

### Step 6 — Backend: Game Toggles
Add to `apps/backend/src/routes/v1/clinic.route.ts`:
```
GET   /clinic/game-toggles    auth('getGameToggles')    → list all games with enabled flag
PATCH /clinic/game-toggles    auth('manageGameToggles') → upsert toggle
```

**Service:** `apps/backend/src/services/gameToggle.service.ts`
- `list`: fetch all Games + LEFT JOIN ClinicGameToggle for tenantId; default `enabled: true` when no toggle row
- `upsert`: `clinicGameToggle.upsert({ where: { tenantId_gameId } })`

---

### Step 7 — Staff service migration
**File:** `apps/backend/src/services/staff.service.ts`
- Replace `departmentIds: true` in `staffSelect` with `departmentMemberships: { select: { departmentId: true } }`
- Derive `departmentIds` in `transformStaff` from memberships
- In `inviteStaff`: remove `departmentIds` from user create; call `tx.userDepartment.createMany()` after user creation
- In `updateStaff`: `userDepartment.deleteMany({ where: { userId } })` then `createMany` for new IDs

---

### Step 8 — Tests
`apps/backend/tests/utils/setupTestDB.ts` — add deleteMany in FK-safe order:
```
clinicGameToggle → userDepartment → sensoryRoom → department → game
```

New test files:
- `tests/integration/departments.test.ts` — 9 tests: create, list (tenant-scoped), update, delete-with-rooms (422), cross-tenant isolation, role guards
- `tests/integration/sensoryRooms.test.ts` — 12 tests: create, capacity cap, code uniqueness, status filter, cross-tenant, PATCH, DELETE
- `tests/integration/gameToggles.test.ts` — 5 tests: list defaults, disable/re-enable, invalid gameId, role guard

New fixtures: `department.fixture.ts`, `sensoryRoom.fixture.ts`, `game.fixture.ts`

---

### Step 9 — Frontend: API + Hooks
```
src/api/departments.ts     — departmentsApi.{list, create, update, remove}
src/api/sensoryRooms.ts    — sensoryRoomsApi.{list, getOne, create, update, remove}
src/api/gameToggles.ts     — gameTogglesApi.{list, upsert}
src/hooks/useDepartments.ts
src/hooks/useSensoryRooms.ts
src/hooks/useGameToggles.ts
```

---

### Step 10 — Frontend: TagInput component
**File:** `src/components/ui/tag-input.tsx`
- Controlled: `value: string[], onChange: (tags: string[]) => void`
- Enter or comma → add chip; Backspace on empty input → remove last; blur → add pending text
- Each chip = `<Badge variant="secondary">` with `×` button
- Integrates with react-hook-form via `<Controller />`

---

### Step 11 — Frontend: ClinicSetupPage
**Route:** `/clinic/setup` — `ProtectedRoute requiredRoles={['clinic_admin']}`

**Files:**
- `src/pages/clinic-admin/setup/ClinicSetupPage.tsx` — Radix Tabs: Departments | Sensory Rooms | Game Library
- `src/pages/clinic-admin/setup/DepartmentsTab.tsx` — table + Dialog form (name, description)
- `src/pages/clinic-admin/setup/SensoryRoomsTab.tsx` — table with status badges + Dialog form (name, code, dept Select, TagInput, status Switch)
- `src/pages/clinic-admin/setup/GameLibraryTab.tsx` — table with per-row Switch toggle

---

### Step 12 — Fix issue file
**File:** `issues/004-departments-sensory-rooms.md` — replace "doctor" → "therapist"

---

## Files created / modified
| File | Action |
|---|---|
| `apps/backend/prisma/schema.prisma` | Add 5 models + enum; remove `User.departmentIds` |
| `packages/shared/src/constants/roles.ts` | Add 6 new rights |
| `packages/shared/src/schemas/{department,sensoryRoom,gameToggle}.schema.ts` | New |
| `packages/shared/src/schemas/index.ts` | Export new schemas |
| `apps/backend/src/services/{department,sensoryRoom,gameToggle}.service.ts` | New |
| `apps/backend/src/services/staff.service.ts` | Migrate departmentIds → join table |
| `apps/backend/src/services/index.ts` | Export 3 new services |
| `apps/backend/src/controllers/{department,sensoryRoom}.controller.ts` | New |
| `apps/backend/src/routes/v1/{department,sensoryRoom}.route.ts` | New |
| `apps/backend/src/routes/v1/clinic.route.ts` | Add game-toggle routes |
| `apps/backend/src/routes/v1/index.ts` | Mount new routes |
| `apps/backend/src/validations/{department,sensoryRoom,gameToggle}.validation.ts` | New |
| `apps/backend/tests/utils/setupTestDB.ts` | Add 5 deleteMany calls |
| `apps/backend/tests/integration/{departments,sensoryRooms,gameToggles}.test.ts` | New |
| `apps/backend/tests/fixtures/{department,sensoryRoom,game}.fixture.ts` | New |
| `apps/frontend/src/api/{departments,sensoryRooms,gameToggles}.ts` | New |
| `apps/frontend/src/hooks/{useDepartments,useSensoryRooms,useGameToggles}.ts` | New |
| `apps/frontend/src/components/ui/tag-input.tsx` | New |
| `apps/frontend/src/pages/clinic-admin/setup/*.tsx` | New (4 files) |
| `apps/frontend/src/App.tsx` | Add `/clinic/setup` route |
| `issues/004-departments-sensory-rooms.md` | Fix "doctor" → "therapist" |

## Status
**Complete.** 127/127 tests passing. Frontend TypeScript compiles clean.
