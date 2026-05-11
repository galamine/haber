# Plan: Issue 009 — Form 1: Milestones, Sensory Profile & Functional Concerns

## Context

Extends the Form 1 Assessment wizard (built in issue 008) with three clinical data sections:
- Section 5: Developmental Milestone ratings (12 milestones)
- Section 6: Sensory Processing Profile (7 sensory systems, 1–5 scale)
- Section 7: Functional & Fine-Motor Concerns (16 concerns, multi-select)

These sections are the structured data backbone for radar charts and the recommender engine. The finalise endpoint gains two new validations: at least one milestone must be rated, and all 7 sensory systems must have a rating.

## Design Decisions (from grill-me session)

1. **Routes**: Nested under existing children pattern → `PUT /v1/children/:childId/assessments/:assessmentId/milestones`
2. **Storage**: Proper join tables (not JSON arrays) — per-row metadata requires it
3. **Upsert strategy**: Delete-then-insert inside `prisma.$transaction` (idempotent, simple)
4. **Milestone validation**: Any `AssessmentMilestone` row satisfies finalise requirement (flat taxonomy, no hierarchy)
5. **Sensory observations**: New `Assessment.sensoryObservations` field (mirrors `functionalConcernObservations` pattern)
6. **Frontend wizard**: Append steps 5, 6, 7 to existing 4-step wizard without refactoring
7. **sensoryObservations API**: Embedded in `PUT /sensory-profile` body alongside ratings array

---

## Implementation Steps

### 1. Prisma Schema (`apps/backend/prisma/schema.prisma`)

**New models:**

```prisma
model AssessmentMilestone {
  id                  String     @id @default(uuid())
  assessmentId        String     @map("assessment_id")
  milestoneId         String     @map("milestone_id")
  achievedAtAgeMonths Int?       @map("achieved_at_age_months")
  delayed             Boolean    @default(false)
  notes               String?
  createdAt           DateTime   @default(now()) @map("created_at")

  assessment Assessment @relation(fields: [assessmentId], references: [id])
  milestone  Milestone  @relation(fields: [milestoneId], references: [id])

  @@unique([assessmentId, milestoneId])
  @@map("assessment_milestones")
}

model AssessmentSensoryRating {
  id              String   @id @default(uuid())
  assessmentId    String   @map("assessment_id")
  sensorySystemId String   @map("sensory_system_id")
  rating          Int
  notes           String?
  createdAt       DateTime @default(now()) @map("created_at")

  assessment    Assessment    @relation(fields: [assessmentId], references: [id])
  sensorySystem SensorySystem @relation(fields: [sensorySystemId], references: [id])

  @@unique([assessmentId, sensorySystemId])
  @@map("assessment_sensory_ratings")
}

model AssessmentFunctionalConcern {
  assessmentId        String @map("assessment_id")
  functionalConcernId String @map("functional_concern_id")

  assessment        Assessment        @relation(fields: [assessmentId], references: [id])
  functionalConcern FunctionalConcern @relation(fields: [functionalConcernId], references: [id])

  @@id([assessmentId, functionalConcernId])
  @@map("assessment_functional_concerns")
}
```

**New fields on `Assessment` model:**
```prisma
functionalConcernObservations String? @map("functional_concern_observations")
sensoryObservations           String? @map("sensory_observations")
```

**Back-relations to add on `Assessment`:**
```prisma
assessmentMilestones         AssessmentMilestone[]
assessmentSensoryRatings     AssessmentSensoryRating[]
assessmentFunctionalConcerns AssessmentFunctionalConcern[]
```

**Back-relations to add on `Milestone`, `SensorySystem`, `FunctionalConcern`:**
```prisma
// Milestone
assessmentMilestones AssessmentMilestone[]

// SensorySystem
assessmentSensoryRatings AssessmentSensoryRating[]

// FunctionalConcern
assessmentFunctionalConcerns AssessmentFunctionalConcern[]
```

Run: `pnpm prisma:migrate` with name `add_assessment_section_models`

---

### 2. Shared Package Schemas (`packages/shared/src/schemas/`)

Create `assessmentSections.schema.ts`:

```typescript
// PUT /milestones body item
export const MilestoneRatingInputSchema = z.object({
  milestoneId: z.string().uuid(),
  achievedAtAgeMonths: z.number().int().min(0).nullable(),
  delayed: z.boolean(),
  notes: z.string().nullable().optional(),
});
export const UpsertMilestonesDtoSchema = z.object({
  milestones: z.array(MilestoneRatingInputSchema),
});

// GET /milestones response item
export const AssessmentMilestoneDtoSchema = z.object({
  id: z.string().uuid(),
  assessmentId: z.string().uuid(),
  milestoneId: z.string().uuid(),
  achievedAtAgeMonths: z.number().int().nullable(),
  delayed: z.boolean(),
  notes: z.string().nullable(),
  createdAt: z.string(),
});

// PUT /sensory-profile body item
export const SensoryRatingInputSchema = z.object({
  sensorySystemId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  notes: z.string().nullable().optional(),
});
export const UpsertSensoryProfileDtoSchema = z.object({
  ratings: z.array(SensoryRatingInputSchema),
  sensoryObservations: z.string().nullable().optional(),
});

// GET /sensory-profile response item
export const AssessmentSensoryRatingDtoSchema = z.object({
  id: z.string().uuid(),
  assessmentId: z.string().uuid(),
  sensorySystemId: z.string().uuid(),
  rating: z.number().int(),
  notes: z.string().nullable(),
  createdAt: z.string(),
});

// PUT /functional-concerns body
export const UpsertFunctionalConcernsDtoSchema = z.object({
  functionalConcernIds: z.array(z.string().uuid()),
  clinicalObservations: z.string().nullable().optional(),
});

// GET /functional-concerns response item
export const AssessmentFunctionalConcernDtoSchema = z.object({
  assessmentId: z.string().uuid(),
  functionalConcernId: z.string().uuid(),
});
```

Export types from `packages/shared/src/dtos/index.ts`.  
Export schemas from `packages/shared/src/schemas/index.ts`.

---

### 3. Backend Validations (`apps/backend/src/validations/`)

Create `assessmentSections.validation.ts`:

```typescript
export default {
  upsertMilestones: {
    params: assessmentIdParam,  // reuse existing { assessmentId }
    body: UpsertMilestonesDtoSchema,
  },
  getMilestones: { params: assessmentIdParam },
  upsertSensoryProfile: {
    params: assessmentIdParam,
    body: UpsertSensoryProfileDtoSchema,
  },
  getSensoryProfile: { params: assessmentIdParam },
  upsertFunctionalConcerns: {
    params: assessmentIdParam,
    body: UpsertFunctionalConcernsDtoSchema,
  },
  getFunctionalConcerns: { params: assessmentIdParam },
};
```

Note: `rating` range (1–5) is validated in the shared Zod schema. Zod validation runs first via middleware, so invalid ratings are caught as 400 before reaching the service.

---

### 4. Backend Service (`apps/backend/src/services/`)

Create `assessmentSections.service.ts`:

**`upsertMilestones(assessmentId, tenantId, userId, role, milestones[])`**
1. Load assessment, verify tenant scope, verify draft status (→ 409 ASSESSMENT_FINALISED if not)
2. Verify therapist assignment (reuse `verifyAssignment` pattern from `assessment.service.ts`)
3. In transaction: `deleteMany({ where: { assessmentId } })` then `createMany({ data: milestones.map(...) })`
4. Return all milestone rows for this assessment

**`getMilestones(assessmentId, tenantId, userId, role)`**
1. Verify access, return `assessmentMilestone.findMany({ where: { assessmentId }, orderBy: { createdAt: 'asc' } })`

**`upsertSensoryProfile(assessmentId, tenantId, userId, role, ratings[], sensoryObservations)`**
1. Verify draft status, verify assignment
2. In transaction:
   - `deleteMany` + `createMany` for ratings
   - `assessment.update({ data: { sensoryObservations } })`
3. Return all rating rows + sensoryObservations

**`getSensoryProfile(assessmentId, tenantId, userId, role)`**
1. Verify access, return ratings + `assessment.sensoryObservations`

**`upsertFunctionalConcerns(assessmentId, tenantId, userId, role, functionalConcernIds[], clinicalObservations)`**
1. Verify draft status, verify assignment
2. In transaction:
   - `deleteMany` + `createMany` for concern join rows
   - `assessment.update({ data: { functionalConcernObservations: clinicalObservations } })`
3. Return selected concerns + `functionalConcernObservations`

**`getFunctionalConcerns(assessmentId, tenantId, userId, role)`**
1. Verify access, return concern rows + `functionalConcernObservations`

**Update `finaliseAssessment` in `assessment.service.ts`:**
Add before status change:
```typescript
const milestoneCount = await prisma.assessmentMilestone.count({ where: { assessmentId } });
if (milestoneCount === 0) throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'MILESTONE_REQUIRED');

const sensoryCount = await prisma.assessmentSensoryRating.count({ where: { assessmentId } });
if (sensoryCount < 7) throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'SENSORY_PROFILE_INCOMPLETE');
```

Export new service from `services/index.ts`.

---

### 5. Backend Controllers (`apps/backend/src/controllers/`)

Create `assessmentSections.controller.ts` — 6 functions, all wrapped in `catchAsync`, following the pattern in `assessment.controller.ts`:

```typescript
const upsertMilestones = catchAsync(async (req, res) => {
  const user = getUser(req);
  const result = await assessmentSectionsService.upsertMilestones(
    req.params.assessmentId, user.tenantId, user.id, user.role, req.body.milestones
  );
  res.send(result);
});
// ... etc for all 6
```

---

### 6. Backend Routes (`apps/backend/src/routes/v1/child.route.ts`)

Add 6 new routes inside the existing assessment route block (after `/:assessmentId/finalise`):

```typescript
router
  .route('/:childId/assessments/:assessmentId/milestones')
  .put(auth('child.assessment'), validate(assessmentSectionsValidation.upsertMilestones), assessmentSectionsController.upsertMilestones)
  .get(auth('child.assessment'), validate(assessmentSectionsValidation.getMilestones), assessmentSectionsController.getMilestones);

router
  .route('/:childId/assessments/:assessmentId/sensory-profile')
  .put(auth('child.assessment'), validate(assessmentSectionsValidation.upsertSensoryProfile), assessmentSectionsController.upsertSensoryProfile)
  .get(auth('child.assessment'), validate(assessmentSectionsValidation.getSensoryProfile), assessmentSectionsController.getSensoryProfile);

router
  .route('/:childId/assessments/:assessmentId/functional-concerns')
  .put(auth('child.assessment'), validate(assessmentSectionsValidation.upsertFunctionalConcerns), assessmentSectionsController.upsertFunctionalConcerns)
  .get(auth('child.assessment'), validate(assessmentSectionsValidation.getFunctionalConcerns), assessmentSectionsController.getFunctionalConcerns);
```

---

### 7. Frontend API (`apps/frontend/src/api/assessments.ts`)

Add to existing file:

```typescript
upsertMilestones: (childId, assessmentId, data) =>
  apiClient.put(`/v1/children/${childId}/assessments/${assessmentId}/milestones`, data),
getMilestones: (childId, assessmentId) =>
  apiClient.get(`/v1/children/${childId}/assessments/${assessmentId}/milestones`),
upsertSensoryProfile: (childId, assessmentId, data) =>
  apiClient.put(`/v1/children/${childId}/assessments/${assessmentId}/sensory-profile`, data),
getSensoryProfile: (childId, assessmentId) =>
  apiClient.get(`/v1/children/${childId}/assessments/${assessmentId}/sensory-profile`),
upsertFunctionalConcerns: (childId, assessmentId, data) =>
  apiClient.put(`/v1/children/${childId}/assessments/${assessmentId}/functional-concerns`, data),
getFunctionalConcerns: (childId, assessmentId) =>
  apiClient.get(`/v1/children/${childId}/assessments/${assessmentId}/functional-concerns`),
```

---

### 8. Frontend Hooks (`apps/frontend/src/hooks/useAssessments.ts`)

Add to existing file:
- `useMilestones(childId, assessmentId)` — React Query GET
- `useUpsertMilestones()` — mutation
- `useSensoryProfile(childId, assessmentId)` — React Query GET
- `useUpsertSensoryProfile()` — mutation
- `useFunctionalConcerns(childId, assessmentId)` — React Query GET
- `useUpsertFunctionalConcerns()` — mutation

---

### 9. Frontend Wizard (`apps/frontend/src/pages/children/AssessmentWizardPage.tsx`)

**State additions:**
```typescript
// S5 — Milestones
const [s5, setS5] = useState<{ milestoneId: string; achievedAtAgeMonths: number | null; delayed: boolean; notes: string }[]>([]);

// S6 — Sensory Profile
const [s6, setS6] = useState<{ sensorySystemId: string; rating: number | null; notes: string }[]>([]);
const [sensoryObservations, setSensoryObservations] = useState('');

// S7 — Functional Concerns
const [s7FunctionalConcernIds, setS7FunctionalConcernIds] = useState<string[]>([]);
const [clinicalObservations, setClinicalObservations] = useState('');
```

**Data loading:** On assessment load, fetch milestones, sensory profile, functional concerns and hydrate state.

**Step 5 — Milestones section:**
- Table with 12 rows (one per seeded milestone from `useTaxonomy('milestones')`)
- Columns: Milestone Name, Age Band, Achieved At (months) input, Delayed checkbox, Notes textarea
- Save on Next: `upsertMilestonesMut.mutateAsync({ milestones: s5 })`

**Step 6 — Sensory Profile section:**
- 7-row table (from `useTaxonomy('sensory-systems')`)
- Columns: System Name, Rating (5 `RadioGroup` buttons labelled 1–5), Notes textarea
- Labels: 1 = Hypo-responsive, 3 = Typical, 5 = Hyper-responsive
- Overall behavioural observations textarea below table
- Save on Next: `upsertSensoryProfileMut.mutateAsync({ ratings: s6, sensoryObservations })`

**Step 7 — Functional Concerns section:**
- Scrollable checklist of 16 items (from `useTaxonomy('functional-concerns')`)
- `Checkbox` per item, `clinicalObservations` textarea below
- Save on Finalise (with section data): `upsertFunctionalConcernsMut.mutateAsync(...)` then `finaliseMut.mutateAsync()`

**Finalise error handling:**
```typescript
try {
  await finaliseMut.mutateAsync();
} catch (err) {
  if (err.code === 'MILESTONE_REQUIRED')
    toast.error('Please rate at least one milestone before finalising');
  else if (err.code === 'SENSORY_PROFILE_INCOMPLETE')
    toast.error('Please rate all 7 sensory systems before finalising');
}
```

**Read-only mode:** Check `assessment.status === 'finalised'` → disable all inputs in steps 5, 6, 7 (mirrors existing pattern in steps 1–4).

---

### 10. Tests (`apps/backend/tests/integration/`)

Create `assessmentSections.test.ts` with setup mirroring `assessment.test.ts`:

| Test | Expected |
|------|----------|
| PUT milestones with all 12 valid entries | 200, 12 AssessmentMilestone rows |
| PUT milestones on finalised assessment | 409 ASSESSMENT_FINALISED |
| PUT sensory-profile with rating 6 | 400 (Zod catches range before service) |
| PUT sensory-profile idempotent re-submit | 200, no duplicate rows |
| POST finalise with 0 milestone rows | 422 MILESTONE_REQUIRED |
| POST finalise with 6 of 7 sensory rated | 422 SENSORY_PROFILE_INCOMPLETE |

---

## Critical Files

| File | Change |
|------|--------|
| `apps/backend/prisma/schema.prisma` | Add 3 new models + 2 fields on Assessment + back-relations |
| `apps/backend/src/services/assessment.service.ts` | Add milestone + sensory checks to `finaliseAssessment` |
| `apps/backend/src/services/assessmentSections.service.ts` | **New** — all section upsert/get logic |
| `apps/backend/src/controllers/assessmentSections.controller.ts` | **New** — 6 controller functions |
| `apps/backend/src/validations/assessmentSections.validation.ts` | **New** |
| `apps/backend/src/routes/v1/child.route.ts` | Add 6 new routes |
| `apps/backend/src/services/index.ts` | Barrel-export new service |
| `packages/shared/src/schemas/assessmentSections.schema.ts` | **New** |
| `packages/shared/src/schemas/index.ts` | Export new schemas |
| `packages/shared/src/dtos/index.ts` | Export new DTOs |
| `apps/frontend/src/api/assessments.ts` | Add 6 new API functions |
| `apps/frontend/src/hooks/useAssessments.ts` | Add 6 new hooks |
| `apps/frontend/src/pages/children/AssessmentWizardPage.tsx` | Add steps 5, 6, 7 |
| `apps/backend/tests/integration/assessmentSections.test.ts` | **New** |

---

## Verification

```bash
# 1. Migrate
cd apps/backend && pnpm prisma:migrate

# 2. Build shared
pnpm build:shared

# 3. Run tests
cd apps/backend && pnpm test -- assessmentSections.test.ts

# 4. Run all tests (regression check)
pnpm test

# 5. Start dev server and manually test wizard steps 5–7
pnpm dev
# Open a draft assessment → navigate to Section 5 → rate milestones
# Try finalise with missing ratings → verify toasts
# Complete all sections → finalise → verify read-only mode
```
