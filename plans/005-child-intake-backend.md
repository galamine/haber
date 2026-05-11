# 005 — Child Intake: Backend Plan

**Issue:** 005-student-intake  
**Type:** AFK  
**Depends on:** 001 (Auth Reform), 003 (Staff Management)

---

## Resolved Design Decisions

| Decision | Choice |
|---|---|
| Permission | `child.intake` added to `allRoles` for `clinic_admin` + `therapist` |
| Assigned therapists | `ChildTherapist` join table (childId + userId), mirrors `UserDepartment` |
| `childCode` generation | MAX+1 inside creation transaction → `CHD-0001` format |
| `intakeComplete` gates | guardian exists + MedicalHistory record exists + heightCm + weightKg + measurementDate all non-null |
| Photo upload | Deferred — `photoUrl` nullable in schema only |
| Hard delete | Omitted from this issue |
| Soft-delete visibility | `includeDeleted=true` query param on `GET /children`, honoured for `super_admin` only |
| Terminology | "child" throughout (not "student") |

---

## Build Order

1. `packages/shared` — roles, schemas, DTOs → `pnpm build:shared`
2. `prisma/schema.prisma` → migration
3. `services/child.service.ts`
4. `controllers/child.controller.ts`
5. `validations/child.validation.ts`
6. `routes/v1/child.route.ts` + mount in `routes/v1/index.ts`
7. `tests/integration/child.test.ts`

---

## Step 1 — Shared Package

### `packages/shared/src/constants/roles.ts`

Add `child.intake` to two roles:

```ts
clinic_admin: [...existing, 'child.intake'],
therapist:    [...existing, 'child.intake'],
```

### `packages/shared/src/schemas/child.schema.ts` (new file)

```ts
CreateChildDtoSchema        // fullName, dob (ISO string), sex enum, spokenLanguages string[], school?, opNumber?, preferredTherapistId?
UpdateChildDtoSchema        // partial demographics + heightCm?, weightKg?, measurementDate?, assignedTherapistIds?
CreateGuardianDtoSchema     // fullName, relationship, phone, email?, loginEnabled?
UpdateGuardianDtoSchema     // partial of CreateGuardian
UpsertMedicalHistoryDtoSchema  // birthTerm enum, gestationalAgeWeeks?, birthComplications?, neonatalHistory?,
                               // immunizations?, allergies?, currentMedications [{name,dose,frequency}][],
                               // priorDiagnoses string[]?, familyHistory?, sensorySensitivities?
```

Sex enum: `male | female | other`  
BirthTerm enum: `term | preterm`

### `packages/shared/src/dtos/child.dto.ts` (new file)

Infer TS types from schemas. Add response shapes:

```ts
ChildDto            // full child record + assignedTherapistIds: string[]
GuardianDto         // guardian record
MedicalHistoryDto   // medical history record
PaginatedChildDto   // { results: ChildDto[], page, limit, totalPages, totalResults }
IntakeStatusDto     // { intakeComplete: boolean, missingFields: string[] }
```

### Update barrel exports

- `packages/shared/src/schemas/index.ts` — re-export child schemas
- `packages/shared/src/dtos/index.ts` — re-export child DTOs

---

## Step 2 — Prisma Schema

**File:** `apps/backend/prisma/schema.prisma`

Add enums:
```prisma
enum Sex { male female other }
enum BirthTerm { term preterm }
```

Add models:

```prisma
model Child {
  id                   String    @id @default(uuid())
  tenantId             String    @map("tenant_id")
  childCode            String    @map("child_code")
  opNumber             String?   @map("op_number")
  fullName             String    @map("full_name")
  dob                  DateTime  @db.Date
  sex                  Sex
  photoUrl             String?   @map("photo_url")
  spokenLanguages      Json      @default("[]") @map("spoken_languages")
  school               String?
  preferredTherapistId String?   @map("preferred_therapist_id")
  heightCm             Decimal?  @map("height_cm")
  weightKg             Decimal?  @map("weight_kg")
  measurementDate      DateTime? @db.Date @map("measurement_date")
  latestPlanId         String?   @map("latest_plan_id")
  intakeComplete       Boolean   @default(false) @map("intake_complete")
  deletedAt            DateTime? @map("deleted_at")
  createdAt            DateTime  @default(now()) @map("created_at")
  updatedAt            DateTime  @updatedAt @map("updated_at")

  clinic             Clinic          @relation(fields: [tenantId], references: [id])
  preferredTherapist User?           @relation("PreferredTherapist", fields: [preferredTherapistId], references: [id])
  guardians          Guardian[]
  medicalHistory     MedicalHistory?
  assignedTherapists ChildTherapist[]

  @@unique([tenantId, childCode])
  @@index([tenantId])
  @@map("children")
}

model Guardian {
  id           String    @id @default(uuid())
  childId      String    @map("child_id")
  fullName     String    @map("full_name")
  relationship String
  phone        String
  email        String?
  loginEnabled Boolean   @default(false) @map("login_enabled")
  deletedAt    DateTime? @map("deleted_at")
  createdAt    DateTime  @default(now()) @map("created_at")

  child Child @relation(fields: [childId], references: [id], onDelete: Cascade)

  @@index([childId])
  @@map("guardians")
}

model MedicalHistory {
  id                   String    @id @default(uuid())
  childId              String    @unique @map("child_id")
  birthTerm            BirthTerm @map("birth_term")
  birthComplications   Json?     @map("birth_complications")
  neonatalHistory      String?   @map("neonatal_history")
  gestationalAgeWeeks  Int?      @map("gestational_age_weeks")
  immunizations        String?
  allergies            String?
  currentMedications   Json      @default("[]") @map("current_medications")
  priorDiagnoses       Json?     @map("prior_diagnoses")
  familyHistory        String?   @map("family_history")
  sensorySensitivities String?   @map("sensory_sensitivities")
  createdAt            DateTime  @default(now()) @map("created_at")
  updatedAt            DateTime  @updatedAt @map("updated_at")

  child Child @relation(fields: [childId], references: [id], onDelete: Cascade)

  @@map("medical_histories")
}

model ChildTherapist {
  childId String @map("child_id")
  userId  String @map("user_id")

  child Child @relation(fields: [childId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([childId, userId])
  @@map("child_therapists")
}
```

Also add back-relations to `User` model:
```prisma
preferredForChildren  Child[]          @relation("PreferredTherapist")
assignedChildren      ChildTherapist[]
```

Run: `cd apps/backend && pnpm prisma:migrate`  
Then: `pnpm prisma:generate`

---

## Step 3 — Service

**File:** `apps/backend/src/services/child.service.ts`

### Private helper — `evaluateIntakeComplete(tx, childId)`

```ts
// Checks three conditions; updates child.intakeComplete
const guardianCount = await tx.guardian.count({ where: { childId, deletedAt: null } })
const medHistory    = await tx.medicalHistory.findUnique({ where: { childId } })
const child         = await tx.child.findUnique({ where: { id: childId }, select: { heightCm, weightKg, measurementDate } })

const complete = guardianCount > 0
  && medHistory !== null
  && child.heightCm !== null && child.weightKg !== null && child.measurementDate !== null

await tx.child.update({ where: { id: childId }, data: { intakeComplete: complete } })
return complete
```

### `createChild(callerId, tenantId, body)`

Inside `prisma.$transaction(async tx => { ... })`:
1. Find latest childCode for tenant: `tx.child.findFirst({ where: { tenantId }, orderBy: { childCode: 'desc' }, select: { childCode: true } })`
2. Parse number from code (`CHD-0001` → `1`), increment, format: `` `CHD-${String(n).padStart(4, '0')}` ``
3. `tx.child.create({ data: { ...body, tenantId, childCode, intakeComplete: false } })`
4. If `body.assignedTherapistIds?.length`: `tx.childTherapist.createMany(...)`
5. Return `ChildDto`

### `queryChildren(callerId, callerRole, tenantId, filter, options)`

Build `where`:
- Always: `tenantId`
- `clinic_admin` / `super_admin`: `deletedAt: null` (unless `filter.includeDeleted && callerRole === 'super_admin'`)
- `therapist`: `deletedAt: null, assignedTherapists: { some: { userId: callerId } }`
- `filter.name`: `fullName: { contains: name, mode: 'insensitive' }`
- `filter.opNumber`: `opNumber: { contains: opNumber, mode: 'insensitive' }`

Paginated — same `{ results, page, limit, totalPages, totalResults }` shape as `queryStaff`.

### `getChildById(callerId, callerRole, tenantId, childId)`

- Find child with `{ tenantId, id: childId, deletedAt: null }`
- If `callerRole === 'therapist'`: verify `ChildTherapist` record exists for `(childId, callerId)` → 403 if not
- Return `ChildDto` including `assignedTherapistIds`

### `updateChild(tenantId, childId, body)`

- Verify child exists in tenant
- If `body.preferredTherapistId`: verify that user has `tenantId` → 422 if cross-clinic
- If `body.assignedTherapistIds` defined: delete-then-recreate `ChildTherapist` (same pattern as `updateStaff` + `UserDepartment`)
- `tx.child.update({ data: pick(body, demographics + anthropometrics) })`
- Call `evaluateIntakeComplete(tx, childId)`

### `upsertMedicalHistory(tenantId, childId, body)`

- Verify child exists in tenant
- `prisma.medicalHistory.upsert({ where: { childId }, create: { childId, ...body }, update: body })`
- Call `evaluateIntakeComplete` (non-tx single call is fine here — use interactive transaction)

### `createGuardian(tenantId, childId, body)`

- Verify child exists in tenant
- `prisma.guardian.create({ data: { childId, ...body } })`
- Call `evaluateIntakeComplete`

### `updateGuardian(tenantId, childId, guardianId, body)`

- Verify guardian belongs to child and child belongs to tenant
- `prisma.guardian.update({ where: { id: guardianId }, data: body })`

### `getIntakeStatus(tenantId, childId)`

- Fetch child + guardian count + medicalHistory existence
- Build `missingFields: string[]` — one entry per failed check:
  - `'guardian'` if no guardians
  - `'medicalHistory'` if no MedicalHistory record
  - `'anthropometrics'` if any of heightCm / weightKg / measurementDate is null
- Return `{ intakeComplete: child.intakeComplete, missingFields }`

### `softDeleteChild(tenantId, childId, callerRole)`

- Verify child in tenant
- If `callerRole` not in `['clinic_admin', 'super_admin']` → 403
- `prisma.child.update({ where: { id: childId }, data: { deletedAt: new Date() } })`

Export as `childService`.

---

## Step 4 — Controller

**File:** `apps/backend/src/controllers/child.controller.ts`

Pattern identical to `staff.controller.ts` — one `catchAsync` per endpoint, extract `user.id`, `user.tenantId`, `user.role` from `req.user`. Export as default `childController`.

Handlers: `createChild`, `getChildren`, `getChildById`, `updateChild`, `upsertMedicalHistory`, `createGuardian`, `updateGuardian`, `getIntakeStatus`, `softDeleteChild`.

---

## Step 5 — Validations

**File:** `apps/backend/src/validations/child.validation.ts`

```ts
const childIdParam = z.object({ childId: z.string().uuid() })

createChild         → { body: CreateChildDtoSchema }
getChildren         → { query: z.object({ name?, opNumber?, includeDeleted?: z.coerce.boolean(), page?, limit?, sortBy? }) }
getChild            → { params: childIdParam }
updateChild         → { params: childIdParam, body: UpdateChildDtoSchema }
upsertMedicalHistory→ { params: childIdParam, body: UpsertMedicalHistoryDtoSchema }
createGuardian      → { params: childIdParam, body: CreateGuardianDtoSchema }
updateGuardian      → { params: childIdParam.extend({ guardianId: z.string().uuid() }), body: UpdateGuardianDtoSchema }
softDeleteChild     → { params: childIdParam }
```

---

## Step 6 — Routes

**File:** `apps/backend/src/routes/v1/child.route.ts`

```ts
POST   /                                auth('child.intake')  → createChild
GET    /                                auth('child.intake')  → getChildren
GET    /:childId                        auth('child.intake')  → getChildById
PATCH  /:childId                        auth('child.intake')  → updateChild
PUT    /:childId/medical-history        auth('child.intake')  → upsertMedicalHistory
POST   /:childId/guardians              auth('child.intake')  → createGuardian
PATCH  /:childId/guardians/:guardianId  auth('child.intake')  → updateGuardian
GET    /:childId/intake-status          auth('child.intake')  → getIntakeStatus
DELETE /:childId                        auth()                → softDeleteChild
```

**File:** `apps/backend/src/routes/v1/index.ts` — add:
```ts
import childRouter from './child.route'
router.use('/children', childRouter)
```

---

## Step 7 — Tests

**File:** `apps/backend/tests/fixtures/child.fixture.ts`

```ts
export const childOne = {
  id: '<uuid>',
  tenantId: clinicOne.id,
  childCode: 'CHD-0001',
  fullName: 'Test Child One',
  dob: new Date('2018-06-15'),
  sex: 'male',
  spokenLanguages: [],
  intakeComplete: false,
}
export const insertChildren = async (children) => prisma.child.createMany({ data: children })
```

**File:** `apps/backend/tests/integration/child.test.ts`

Test cases (matching acceptance criteria):

| # | Test |
|---|---|
| 1 | `POST /v1/children` → 201 with `intakeComplete: false` |
| 2 | Fill guardian + medical history + anthropometrics → `GET /v1/children/:id/intake-status` returns `{ intakeComplete: true, missingFields: [] }` |
| 3 | `GET /v1/children` as therapist in Clinic B → does not return Clinic A children |
| 4 | `DELETE /v1/children/:id` sets `deletedAt`; child absent from list; `GET /v1/children?includeDeleted=true` as `super_admin` returns it |
| 5 | `PATCH /v1/children/:id` with `preferredTherapistId` from different clinic → 422 |
| 6 | `GET /v1/children/:id` as therapist not in `ChildTherapist` → 403 |

**File:** `apps/backend/tests/utils/setupTestDB.ts` — add to teardown:
```ts
prisma.childTherapist.deleteMany(),
prisma.medicalHistory.deleteMany(),
prisma.guardian.deleteMany(),
prisma.child.deleteMany(),
```

---

## Verification

```bash
# 1. Build shared
pnpm build:shared

# 2. Migrate
cd apps/backend && pnpm prisma:migrate && pnpm prisma:generate

# 3. Run tests
pnpm test -- child.test.ts
```

All 6 test cases must pass. No regressions in existing test files.
