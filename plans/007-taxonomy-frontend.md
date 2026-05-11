# 007 — Clinical Taxonomy Seeding: Frontend Plan

**Issue:** 007-clinical-taxonomy-seeding  
**Type:** AFK  
**Depends on:** Backend plan (`007-taxonomy-backend.md`)

---

## Resolved Design Decisions

| Decision | Choice |
|---|---|
| Extensions tab location | 4th tab on existing `ClinicSetupPage` (Departments / Rooms / Games / **Extensions**) |
| Tab component pattern | Mirror `DepartmentsTab.tsx` — React Hook Form + Zod, shadcn Table, modal dialog, sonner toast |
| Section layout | 7 accordion-style sections (one per taxonomy type) in a single tab |
| What to display | Clinic-scoped entries only (`tenantId !== null`) — global entries are not manageable |
| Auth guard | `clinic_admin` only — tab is not visible to therapists |
| Response shape from API | Flat array `{ data: TaxonomyItem[] }` — no pagination |
| Delete confirmation | Inline icon button, no confirmation dialog (mirrors DepartmentsTab) |
| Add form | Per-type modal — fields differ per taxonomy (see Step 3) |

---

## Backend Data Contracts

### GET `/v1/taxonomies/:type`

`type` is one of: `diagnoses` | `milestones` | `sensory-systems` | `functional-concerns` | `assessment-tools` | `equipment` | `intervention-approaches`

**Auth:** `child.intake` (clinic_admin + therapist)

**Response:**
```ts
{ data: TaxonomyItem[] }

// Per-type shapes:
type DiagnosisDto = {
  id: string
  name: string
  icdReference: string | null
  frameworkId: string       // 'global' or 'clinic_{tenantId}'
  tenantId: string | null
  createdAt: string
}

type MilestoneDto = {
  id: string
  name: string
  ageBandMinMonths: number
  ageBandMaxMonths: number
  scoringScaleMin: number
  scoringScaleMax: number
  description: string
  frameworkId: string
  tenantId: string | null
  createdAt: string
}

type SensorySystemDto = {
  id: string
  name: string
  description: string
  frameworkId: string
  tenantId: string | null
  createdAt: string
}

type FunctionalConcernDto = {
  id: string
  name: string
  category: string | null
  frameworkId: string
  tenantId: string | null
  createdAt: string
}

type AssessmentToolDto = {
  id: string
  name: string
  fullName: string | null
  description: string | null
  frameworkId: string
  tenantId: string | null
  createdAt: string
}

type EquipmentDto = {
  id: string
  name: string
  category: string | null
  frameworkId: string
  tenantId: string | null
  createdAt: string
}

type InterventionApproachDto = {
  id: string
  name: string
  description: string | null
  frameworkId: string
  tenantId: string | null
  createdAt: string
}

// Union for convenience
type TaxonomyItemDto =
  | DiagnosisDto
  | MilestoneDto
  | SensorySystemDto
  | FunctionalConcernDto
  | AssessmentToolDto
  | EquipmentDto
  | InterventionApproachDto
```

### POST `/v1/taxonomies/:type`

**Auth:** `manageTaxonomies` (clinic_admin only)

**Request body per type:**
```ts
// diagnoses
{ name: string; icdReference?: string }

// milestones
{ name: string; ageBandMinMonths: number; ageBandMaxMonths: number; scoringScaleMin: number; scoringScaleMax: number; description: string }

// sensory-systems
{ name: string; description: string }

// functional-concerns
{ name: string; category?: string }

// assessment-tools
{ name: string; fullName?: string; description?: string }

// equipment
{ name: string; category?: string }

// intervention-approaches
{ name: string; description?: string }
```

**Response:** The created `TaxonomyItemDto` (201)

### DELETE `/v1/taxonomies/:type/:id`

**Auth:** `manageTaxonomies` (clinic_admin only)

**Response:** 204 No Content

**Error:** 403 `CANNOT_DELETE_GLOBAL_TAXONOMY` if `id` belongs to a global entry

---

## Build Order

1. `api/taxonomies.ts`
2. `hooks/useTaxonomies.ts`
3. `pages/clinic-admin/setup/ClinicExtensionsTab.tsx`
4. `pages/clinic-admin/setup/ClinicSetupPage.tsx` — add 4th tab

---

## Step 1 — API Client

**File:** `apps/frontend/src/api/taxonomies.ts`

Pattern mirrors `api/staff.ts` — thin wrappers over `apiClient`.

```ts
export type TaxonomyType =
  | 'diagnoses'
  | 'milestones'
  | 'sensory-systems'
  | 'functional-concerns'
  | 'assessment-tools'
  | 'equipment'
  | 'intervention-approaches'

export const taxonomiesApi = {
  list: (type: TaxonomyType) =>
    apiClient.get<{ data: TaxonomyItemDto[] }>(`/v1/taxonomies/${type}`),

  create: (type: TaxonomyType, data: Record<string, unknown>) =>
    apiClient.post<TaxonomyItemDto>(`/v1/taxonomies/${type}`, data),

  remove: (type: TaxonomyType, id: string) =>
    apiClient.delete<void>(`/v1/taxonomies/${type}/${id}`),
}
```

Import `TaxonomyItemDto` (and per-type DTOs) from `@haber/shared/dtos`.

---

## Step 2 — Hooks

**File:** `apps/frontend/src/hooks/useTaxonomies.ts`

Pattern mirrors `hooks/useStaff.ts`.

```ts
export const taxonomyKeys = {
  all: ['taxonomies'] as const,
  list: (type: TaxonomyType) => [...taxonomyKeys.all, type] as const,
}

// Fetch all entries (global + tenant) for a given taxonomy type
export function useTaxonomy(type: TaxonomyType) {
  return useQuery({
    queryKey: taxonomyKeys.list(type),
    queryFn: () => taxonomiesApi.list(type),
    select: (res) => res.data,
  })
}

// Only the clinic's own extensions (tenantId !== null)
export function useTenantTaxonomy(type: TaxonomyType) {
  return useQuery({
    queryKey: taxonomyKeys.list(type),
    queryFn: () => taxonomiesApi.list(type),
    select: (res) => res.data.filter((item) => item.tenantId !== null),
  })
}

export function useCreateTaxonomyEntry(type: TaxonomyType) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => taxonomiesApi.create(type, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taxonomyKeys.list(type) }),
  })
}

export function useDeleteTaxonomyEntry(type: TaxonomyType) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => taxonomiesApi.remove(type, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taxonomyKeys.list(type) }),
  })
}
```

---

## Step 3 — Clinic Extensions Tab

**File:** `apps/frontend/src/pages/clinic-admin/setup/ClinicExtensionsTab.tsx`

Overall structure — one `<TaxonomySection>` per type, stacked vertically:

```tsx
export default function ClinicExtensionsTab() {
  return (
    <div className="space-y-8">
      <TaxonomySection type="diagnoses" label="Diagnoses" />
      <TaxonomySection type="milestones" label="Developmental Milestones" />
      <TaxonomySection type="sensory-systems" label="Sensory Systems" />
      <TaxonomySection type="functional-concerns" label="Functional Concerns" />
      <TaxonomySection type="assessment-tools" label="Assessment Tools" />
      <TaxonomySection type="equipment" label="Equipment" />
      <TaxonomySection type="intervention-approaches" label="Intervention Approaches" />
    </div>
  )
}
```

### `TaxonomySection` sub-component

Each section follows the `DepartmentsTab` pattern exactly:

```
┌──────────────────────────────────────────────────┐
│ Diagnoses   (2 custom entries)     [+ Add]       │
├────────────────────────────┬─────────────────────┤
│ Name                       │ ICD Reference   [ ] │
│ Custom ASD variant         │ F84.0           🗑  │
│ Hypotonia NOS              │ —               🗑  │
└────────────────────────────┴─────────────────────┘
```

State:
```ts
const [open, setOpen] = useState(false)
const { data: entries = [], isLoading } = useTenantTaxonomy(type)
const create = useCreateTaxonomyEntry(type)
const remove = useDeleteTaxonomyEntry(type)
```

Delete handler:
```ts
const handleDelete = async (id: string) => {
  await remove.mutateAsync(id)
  toast.success('Entry removed')
}
```

### Add modal — form fields per type

Each type opens the same modal shell but with different form fields:

| Type | Fields |
|---|---|
| `diagnoses` | `name` (required), `icdReference` (optional) |
| `milestones` | `name` (required), `ageBandMinMonths` (number, required), `ageBandMaxMonths` (number, required), `description` (required) — scoringScale fixed at 0–5, not user-editable |
| `sensory-systems` | `name` (required), `description` (required) |
| `functional-concerns` | `name` (required), `category` (optional) |
| `assessment-tools` | `name` (required), `fullName` (optional), `description` (optional) |
| `equipment` | `name` (required), `category` (optional) |
| `intervention-approaches` | `name` (required), `description` (optional) |

Form submission:
```ts
const handleSubmit = async (data: FormValues) => {
  await create.mutateAsync(data)
  toast.success('Entry added')
  setOpen(false)
  form.reset()
}
```

### Table columns per type

| Type | Columns shown |
|---|---|
| `diagnoses` | Name, ICD Reference |
| `milestones` | Name, Age Band (e.g. "4–9 months"), Description |
| `sensory-systems` | Name, Description |
| `functional-concerns` | Name, Category |
| `assessment-tools` | Name, Full Name |
| `equipment` | Name, Category |
| `intervention-approaches` | Name, Description |

All tables have a final "Actions" column with a delete icon button (`Trash2` from lucide-react). `frameworkId === 'global'` entries are never shown in this tab — filtered out by `useTenantTaxonomy`.

---

## Step 4 — ClinicSetupPage: Add 4th Tab

**File:** `apps/frontend/src/pages/clinic-admin/setup/ClinicSetupPage.tsx`

Add `extensions` tab trigger and content alongside the existing three:

```tsx
// TabsList — add after "games" trigger
<TabsTrigger value="extensions">Clinic Extensions</TabsTrigger>

// TabsContent — add after games content
<TabsContent value="extensions">
  <ClinicExtensionsTab />
</TabsContent>
```

Import `ClinicExtensionsTab` at top of file.

---

## Verification

```bash
pnpm dev
```

Golden path:
1. Log in as `clinic_admin`
2. Navigate to `/clinic/setup` → 4 tabs visible (Departments, Sensory Rooms, Game Library, **Clinic Extensions**)
3. Click "Clinic Extensions" → 7 sections rendered, each empty initially
4. Expand "Diagnoses" section → click "Add" → modal opens with `name` + `icdReference` fields
5. Fill in name → "Save" → entry appears in the Diagnoses table
6. Click trash icon → entry removed
7. Navigate away and back → entry persists (server-side, not local state)

Tenant isolation:
- Log in as a different clinic's admin → their Diagnoses section is empty (the entry created above does not appear)

Auth guard:
- Log in as `therapist` → `/clinic/setup` route is inaccessible (ProtectedRoute blocks `clinic_admin`-only pages)
