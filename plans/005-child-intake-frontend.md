# 005 — Child Intake: Frontend Plan

**Issue:** 005-student-intake  
**Type:** AFK  
**Depends on:** Backend plan (`005-child-intake-backend.md`)

---

## Resolved Design Decisions

| Decision | Choice |
|---|---|
| Wizard data flow | Incremental saves — create on step 1, call separate endpoints per step |
| Wizard state | Local `useState` — no URL encoding, no Zustand |
| Photo upload | Deferred — `Avatar` component as static placeholder |
| Detail page tabs | Radix `Tabs` with `defaultValue="profile"` (matches `ClinicSetupPage` pattern) |
| Stub tabs | Assessments / Treatment Plan / Sessions show placeholder content |
| Route access | `clinic_admin` and `therapist` roles only |
| Terminology | "child" throughout |

---

## Build Order

1. `api/children.ts`
2. `hooks/useChildren.ts`
3. `pages/children/ChildListPage.tsx`
4. `pages/children/ChildCreatePage.tsx`
5. `pages/children/ChildDetailPage.tsx` + tab components
6. `App.tsx` — add routes
7. Sidebar — add nav item

---

## Step 1 — API Client

**File:** `apps/frontend/src/api/children.ts`

Pattern mirrors `api/staff.ts` — thin wrappers over `apiClient`.

```ts
export interface GetChildrenParams {
  name?: string
  opNumber?: string
  includeDeleted?: boolean
  sortBy?: string
  limit?: number
  page?: number
}

export const childrenApi = {
  getChildren: (params?: GetChildrenParams) => apiClient.get<PaginatedChildDto>('/v1/children?' + buildQuery(params)),
  getChildById: (childId: string) => apiClient.get<ChildDto>(`/v1/children/${childId}`),
  createChild: (data: CreateChildDto) => apiClient.post<ChildDto>('/v1/children', data),
  updateChild: (childId: string, data: UpdateChildDto) => apiClient.patch<ChildDto>(`/v1/children/${childId}`, data),
  upsertMedicalHistory: (childId: string, data: UpsertMedicalHistoryDto) =>
    apiClient.put<MedicalHistoryDto>(`/v1/children/${childId}/medical-history`, data),
  createGuardian: (childId: string, data: CreateGuardianDto) =>
    apiClient.post<GuardianDto>(`/v1/children/${childId}/guardians`, data),
  updateGuardian: (childId: string, guardianId: string, data: UpdateGuardianDto) =>
    apiClient.patch<GuardianDto>(`/v1/children/${childId}/guardians/${guardianId}`, data),
  getIntakeStatus: (childId: string) => apiClient.get<IntakeStatusDto>(`/v1/children/${childId}/intake-status`),
  softDeleteChild: (childId: string) => apiClient.delete<void>(`/v1/children/${childId}`),
}
```

`buildQuery` — same URLSearchParams pattern as `staffApi.getStaff`.

---

## Step 2 — Hooks

**File:** `apps/frontend/src/hooks/useChildren.ts`

Pattern mirrors `hooks/useStaff.ts`.

```ts
export const childrenKeys = {
  all: ['children'] as const,
  list: (params?: object) => [...childrenKeys.all, 'list', params] as const,
  detail: (id: string) => [...childrenKeys.all, 'detail', id] as const,
  intakeStatus: (id: string) => [...childrenKeys.all, 'intake-status', id] as const,
}

useChildren(params?)          // useQuery — paginated list
useChild(childId)             // useQuery — detail; enabled: !!childId
useIntakeStatus(childId)      // useQuery — { intakeComplete, missingFields }

useCreateChild()              // useMutation — onSuccess: invalidate list
useUpdateChild()              // useMutation — onSuccess: setQueryData detail + invalidate list
useUpsertMedicalHistory()     // useMutation — onSuccess: invalidate detail + intakeStatus
useCreateGuardian()           // useMutation — onSuccess: invalidate detail + intakeStatus
useUpdateGuardian()           // useMutation — onSuccess: invalidate detail
useSoftDeleteChild()          // useMutation — onSuccess: invalidate list
```

---

## Step 3 — Child List Page

**File:** `apps/frontend/src/pages/children/ChildListPage.tsx`

Structure mirrors `StaffPage.tsx`.

```
<div className="space-y-6">
  <div className="flex items-center justify-between">
    <h1>Children</h1>
    <Button onClick={() => navigate('/children/new')}>New Child</Button>
  </div>

  <Input placeholder="Search by name..." value={search} onChange={...} />   {/* debounced */}

  <Table>
    <TableHeader> Name | Age | OP Number | Assigned Therapists | Intake Status </TableHeader>
    <TableBody>
      {data?.results.map(child => (
        <TableRow>
          <TableCell><Link to={`/children/${child.id}`}>{child.fullName}</Link></TableCell>
          <TableCell>{computeAge(child.dob)}</TableCell>
          <TableCell>{child.opNumber ?? '—'}</TableCell>
          <TableCell>{child.assignedTherapistCount} therapist(s)</TableCell>
          <TableCell>
            {child.intakeComplete
              ? <Badge variant="default">Complete</Badge>
              : <Badge variant="secondary">Incomplete</Badge>}
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>

  <p className="text-sm text-muted-foreground">Page {page} of {totalPages} — {totalResults} total</p>
</div>
```

`computeAge(dob)` — helper that returns age in years as string (e.g. `"6 yrs"`).

---

## Step 4 — Child Create Wizard

**File:** `apps/frontend/src/pages/children/ChildCreatePage.tsx`

### State

```ts
const [step, setStep] = useState(1)           // 1–4
const [childId, setChildId] = useState<string | null>(null)
```

### Step indicator

Numbered pills 1–4 at top, current step highlighted. Steps: Demographics → Guardians → Medical History → Anthropometrics.

### Step 1 — Demographics

Fields (all required unless marked optional):
- `fullName` — text input
- `dob` — date input
- `sex` — `RadioGroup` (Male / Female / Other)  
- `spokenLanguages` — `TagInput` component (already in `components/ui/tag-input.tsx`)
- `school` — text input (optional)
- `opNumber` — text input (optional)
- Photo — `Avatar` component as static placeholder (no upload)

On "Next":
```ts
const child = await createChild.mutateAsync(formData)
setChildId(child.id)
setStep(2)
```

### Step 2 — Guardians

State: list of added guardians (fetched via `useChild(childId).data.guardians` or local state).

Inline "Add Guardian" form:
- `fullName`, `relationship`, `phone` — required text inputs
- `email` — optional text input

"Add Guardian" button → `createGuardian.mutateAsync({ childId, ...formData })` → reset inline form.

Guardian cards displayed below form (fullName, relationship, phone).

"Next" button disabled with tooltip if no guardians added.

### Step 3 — Medical History

Fields:
- `birthTerm` — `Select` (Term / Preterm) — required
- `gestationalAgeWeeks` — number input (optional)
- `birthComplications` — `Textarea` (optional)
- `neonatalHistory` — `Textarea` (optional)
- `immunizations` — `Textarea` (optional)
- `allergies` — `Textarea` (optional)
- `currentMedications` — dynamic rows:
  - Each row: Name input + Dose input + Frequency input + Remove button
  - "Add Medication" button appends empty row
  - State: `useState<{ name: string; dose: string; frequency: string }[]>([])`
- `priorDiagnoses` — `TagInput` (optional)
- `familyHistory` — `Textarea` (optional)
- `sensorySensitivities` — `Textarea` (optional)

On "Next":
```ts
await upsertMedicalHistory.mutateAsync({ childId, ...formData })
setStep(4)
```

### Step 4 — Anthropometrics

Fields:
- `heightCm` — number input
- `weightKg` — number input
- `measurementDate` — date input

On "Finish":
```ts
await updateChild.mutateAsync({ childId, data: { heightCm, weightKg, measurementDate } })
navigate(`/children/${childId}`)
```

---

## Step 5 — Child Detail Page

**File:** `apps/frontend/src/pages/children/ChildDetailPage.tsx`

```tsx
const { childId } = useParams()
const { data: child } = useChild(childId)
const { data: intakeStatus } = useIntakeStatus(childId)
```

### Intake banner (above tabs)

```tsx
{intakeStatus?.intakeComplete
  ? <Alert variant="default">Intake Complete</Alert>
  : <Alert variant="warning">
      Intake Incomplete — missing: {intakeStatus?.missingFields.join(', ')}
    </Alert>
}
```

### Tab layout (matches `ClinicSetupPage` pattern)

```tsx
<Tabs defaultValue="profile">
  <TabsList>
    <TabsTrigger value="profile">Profile</TabsTrigger>
    <TabsTrigger value="medical-history">Medical History</TabsTrigger>
    <TabsTrigger value="guardians">Guardians</TabsTrigger>
    <TabsTrigger value="assessments">Assessments</TabsTrigger>
    <TabsTrigger value="treatment-plan">Treatment Plan</TabsTrigger>
    <TabsTrigger value="sessions">Sessions</TabsTrigger>
  </TabsList>

  <TabsContent value="profile"><ProfileTab child={child} /></TabsContent>
  <TabsContent value="medical-history"><MedicalHistoryTab childId={childId} /></TabsContent>
  <TabsContent value="guardians"><GuardiansTab childId={childId} /></TabsContent>
  <TabsContent value="assessments"><AssessmentsStub intakeComplete={intakeStatus?.intakeComplete} /></TabsContent>
  <TabsContent value="treatment-plan"><p className="text-muted-foreground">Coming soon</p></TabsContent>
  <TabsContent value="sessions"><p className="text-muted-foreground">Coming soon</p></TabsContent>
</Tabs>
```

### Tab components

**`tabs/ProfileTab.tsx`**  
Displays: fullName, dob, sex, age, OP number, school, spoken languages, photo placeholder, assigned therapists list, preferred therapist, anthropometrics (height, weight, measurement date).

**`tabs/MedicalHistoryTab.tsx`**  
Read-only display of all MedicalHistory fields. Fetch via `useChild(childId).data.medicalHistory` or a dedicated query.

**`tabs/GuardiansTab.tsx`**  
List of guardian cards: fullName, relationship, phone, email (if set). Each card as a `Card` component.

**`tabs/AssessmentsStub.tsx`**  
```tsx
<div>
  <Tooltip content="Complete intake first" disabled={intakeComplete}>
    <Button disabled={!intakeComplete}>Start Assessment</Button>
  </Tooltip>
  <p className="text-muted-foreground mt-4">Assessments coming soon</p>
</div>
```

---

## Step 6 — Routes

**File:** `apps/frontend/src/App.tsx`

Add inside the authenticated `ProtectedRoute` layout:

```tsx
<Route
  path="children"
  element={
    <ProtectedRoute requiredRoles={['clinic_admin', 'therapist']}>
      <ChildListPage />
    </ProtectedRoute>
  }
/>
<Route
  path="children/new"
  element={
    <ProtectedRoute requiredRoles={['clinic_admin', 'therapist']}>
      <ChildCreatePage />
    </ProtectedRoute>
  }
/>
<Route
  path="children/:childId"
  element={
    <ProtectedRoute requiredRoles={['clinic_admin', 'therapist']}>
      <ChildDetailPage />
    </ProtectedRoute>
  }
/>
```

Import the three page components.

---

## Step 7 — Sidebar

**File:** `apps/frontend/src/components/shell/AppSidebar.tsx` (or `MainSidebar.tsx`)

Add "Children" nav item with link to `/children`, visible to `clinic_admin` and `therapist` roles.

---

## Verification

```bash
pnpm dev
```

Golden path:
1. Log in as `clinic_admin` or `therapist`
2. Navigate to `/children` → table renders with "New Child" button
3. Click "New Child" → wizard opens at step 1
4. Complete all 4 steps → redirected to `/children/:id`
5. Detail page shows green "Intake Complete" banner
6. All 6 tabs visible; Assessments tab shows enabled "Start Assessment" button

Incomplete intake path:
1. Complete only step 1 of wizard → click away (navigate to `/children`)
2. Click the partial child → detail page shows amber "Intake Incomplete — missing: guardian, medicalHistory, anthropometrics"
3. Assessments tab → "Start Assessment" button disabled with tooltip

Tenant isolation:
- Log in as therapist → only assigned children appear in list
- Log in as `clinic_admin` → all children in tenant appear
