# FE: Therapist Assignment

## Context

Add a Therapist Assignment step to the existing child intake wizard (`apps/web/src/routes/_authenticated/children/new.tsx`) between Guardian and Consent. The child must be created first (Guardian step), so therapist assignment happens after.

**Existing backend support:**
- `ChildTherapistAssignment` model exists (`packages/db/prisma/schema/clinical.prisma`)
- `AssignTherapistInput` schema exists (`packages/api/src/schemas/child.ts:61-65`)
- `assignTherapist` tRPC mutation exists (`packages/api/src/routers/child.ts`)
- `staff.list({ role: "THERAPIST" })` fetches clinic therapists

---

## New Form Flow

```
Step 1: Profile
Step 2: Medical History
Step 3: Guardian          ← child gets created here (unchanged)
Step 4: Therapist        ← NEW: assign therapist to created child
Step 5: Consent
```

---

## Changes

### 1. `STEPS` constant

```typescript
const STEPS = ["Profile", "Medical History", "Guardian", "Therapist", "Consent"];
```

### 2. New state

```typescript
const [therapistData, setTherapistData] = useState<TherapistAssignmentValues | null>(null);
```

### 3. New schema

```typescript
const TherapistAssignmentSchema = z.object({
  therapistId: z.string().min(1, "Therapist is required"),
  reviewDueAt: z.string().optional(),
});
```

### 4. `Step4Therapist` component

**Query:** `useQuery(trpc.staff.list.queryOptions({ role: "THERAPIST", pageSize: 100 }))`

**Fields:**

| Field | Type | Required | UI |
|-------|------|----------|-----|
| `therapistId` | string | Yes | shadcn `Select` (not native `<select>`) — use `SelectItem` for each therapist |
| `reviewDueAt` | date | No | `Input type="date"` |

**Dropdown UI pattern** (from Step 1 sex field — must use shadcn Select, not native select):
```tsx
<Controller
  control={control}
  name="therapistId"
  render={({ field }) => (
    <Select value={field.value} onValueChange={field.onChange}>
      <SelectTrigger className={errors.therapistId ? "border-red-500" : ""}>
        <SelectValue placeholder="Select a therapist" />
      </SelectTrigger>
      <SelectContent>
        {therapists.length === 0 ? (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">No therapists available</div>
        ) : (
          therapists.map((therapist) => (
            <SelectItem key={therapist.id} value={therapist.id}>
              {therapist.name} ({therapist.email})
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  )}
/>
```

**States:**
- Loading: disabled Input with "Loading therapists..." placeholder
- Empty: "No therapists available" message inside SelectContent
- Error: "Failed to load therapists" with retry button

### 5. Mutation hook

```typescript
const assignTherapistMutation = useMutation(
  trpc.child.assignTherapist.mutationOptions(),
);
```

**Important:** Use `useMutation` hook (not direct `mutateAsync` call).

### 6. `handleStep4`

```typescript
async function handleStep4(data: TherapistAssignmentValues) {
  if (!createdChild) return;
  try {
    await assignTherapistMutation.mutateAsync({
      childId: createdChild.id,
      therapistId: data.therapistId,
      reviewDueAt: data.reviewDueAt ? new Date(data.reviewDueAt) : undefined,
    });
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Failed to assign therapist");
    return;
  }
  setTherapistData(data);
  setStep(5);
}
```

**Important:** Show actual error message in catch block, not generic "Failed to assign therapist".

### 7. Rename `Step4SendConsentLink` → `Step5SendConsentLink`

### 8. Step conditionals update

- Step 3 (Guardians): back → `setStep(2)` (unchanged)
- New step 4: `{step === 4 && createdChild && (<Step4Therapist ... />)}`
- Step 5 (Consent): `step === 4` → `step === 5`, back → `setStep(4)`

---

## Backend Change Required

**File:** `packages/api/src/routers/child.ts`

**Procedure:** `assignTherapist`

**Change:** Remove `isClinicAdmin` check, require only `child.intake` permission.

```typescript
// Before:
const isClinicAdmin = role === "CLINIC_ADMIN";
const hasIntake = await hasPermission(ctx, PERMISSIONS.CHILD_INTAKE);
if (!isClinicAdmin && !hasIntake) {
  throw new TRPCError({ code: "FORBIDDEN" });
}

// After:
const hasIntake = await hasPermission(ctx, PERMISSIONS.CHILD_INTAKE);
if (!hasIntake) {
  throw new TRPCError({ code: "FORBIDDEN" });
}
```

---

## Files Changed

| File | Changes |
|------|---------|
| `apps/web/src/routes/_authenticated/children/new.tsx` | Add schema, state, Step4Therapist component, useMutation hook, improve error handling, update STEPS/hardlers/conditionals |
| `packages/api/src/routers/child.ts` | Update assignTherapist permission check to require only `child.intake` |

---

## Patterns & Reuse

| Concern | Source |
|---------|--------|
| Query pattern | `departments/index.tsx:141-144` — `useQuery(trpc.staff.list.queryOptions(...))` |
| Data access | `therapistsData?.items ?? []` |
| Dropdown UI | Step 1 Profile sex field — shadcn `Select` + `Controller` |
| Mutation hook | Created via `useMutation(trpc.xxx.mutationOptions())` |
| Error handling | Show actual error message from catch block |

---

## Verification

1. `pnpm check-types` passes
2. `pnpm check` (Biome) clean
3. Complete intake with therapist → child created → `ChildTherapistAssignment` record exists in DB
4. Dropdown displays therapists correctly with shadcn styling
