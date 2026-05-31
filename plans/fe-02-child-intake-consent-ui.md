# Plan: FE-02 Child Intake, Guardian & Consent UI

## Context

Implements the child intake wizard, child list/search page, child profile page, and consent management UI from issue `issues/fe-02-child-intake-consent-ui.md`. The backend APIs (BE-05, BE-06) are already implemented. This plan converts the Stitch designs from `stitch_haber/children_directory/`, `stitch_haber/new_child_intake_step_1_profile/`, and `stitch_haber/new_child_intake_step_4_consent/` into production React components following existing app patterns.

---

## Files to Create

```
apps/web/src/routes/_authenticated/children/
├── index.tsx           → /dashboard/children  (list + search)
├── new.tsx             → /dashboard/children/new  (4-step wizard)
└── $childId/
    ├── index.tsx       → /dashboard/children/:childId  (profile + tabs)
    ├── edit.tsx        → /dashboard/children/:childId/edit
    └── consent.tsx     → /dashboard/children/:childId/consent
```

## Files to Modify

- `apps/web/src/components/shell/AppShell.tsx` — add "Children" nav item (roles: CLINIC_ADMIN, THERAPIST, STAFF)

---

## Implementation Details

### 1. `children/index.tsx` — ChildrenListPage

**Route guard:** all authenticated roles.

**State:** `search`, `consentStatus` filter, `page`.

**Data:**
```ts
const { data, isLoading } = useQuery(
  trpc.child.list.queryOptions({ page, pageSize: 20, search, consentStatus })
);
```

**Layout (matching stitch):**
- Page header: "Children" title + "Register New Child" button → `router.navigate({ to: "/children/new" })`
- Filter bar: search input, consent status select (`PENDING | GRANTED | WITHDRAWN | all`)
- Table columns: Name+DOB avatar cell, Age, OP Number, Consent badge, Assigned Therapists, Active Plan
- Consent badge colors: GRANTED=green, PENDING=yellow, WITHDRAWN=red
- Skeleton: 5-row table skeleton during load
- Empty state: icon + "No children registered yet."
- Pagination: prev/next with page count
- Row click → `router.navigate({ to: "/children/$childId", params: { childId: row.id } })`

---

### 2. `children/new.tsx` — NewChildPage (4-step wizard)

**Wizard data flow:**
```
Step 1 (Profile)
  → Step 2 (Medical History)
    → Step 3 (Guardians)
      → child.create mutation fires here
        → Step 4 (Consent) — now has real childId + guardianIds
          → on complete → navigate to /children/:childId
```

**Wizard state (useState in parent):**
```ts
const [step, setStep] = useState(1);
const [profileData, setProfileData] = useState<ProfileValues | null>(null);
const [medicalData, setMedicalData] = useState<MedicalHistoryInput | null>(null);
const [createdChild, setCreatedChild] = useState<{
  id: string;
  guards: { id: string; name: string; relation: string }[];
} | null>(null);
```

**Stepper (matching stitch):** 4 circles with labels (Profile, Medical History, Guardians, Consent), brown-600 active, surface-variant inactive. Progress line animates width.

**Header:** "Cancel Intake" (→ navigate back to /children), "Save as Draft" (UI only, disabled).

#### Step 1 — Profile
Schema: `CreateChildInput` minus `guardians`, split `fullName` into `firstName`/`lastName` on the client.

Fields (2-col grid):
- First Name, Last Name
- DOB (date input), Legal Sex (select: Male/Female/Other/Prefer not to say)
- OP Number (full-width with helper text)
- Photo upload circle (visual; sets `photoUrl` as empty string for now)
- Address (full-width street), then City/State/ZIP (3-col sub-grid)
- Languages spoken (text input, comma-separated → `string[]`)
- School (text input)
- Preferred Therapist ID (text input for now, optional)

On "Continue": validate with `zodResolver`, save to `profileData`, advance to step 2.

#### Step 2 — Medical History
Schema: `MedicalHistoryInput` (all fields optional).

Fields (all full-width `<Textarea>`):
- Birth History, Immunisations, Allergies, Current Medications, Prior Diagnoses, Family History, Sensory Sensitivities

On "Continue": save to `medicalData`, advance to step 3.

#### Step 3 — Guardians
Dynamic list using `useFieldArray`.

Each guardian card: Name, Relation, Phone, Email (all required).
"Add Guardian" button appends new empty row. Remove button on each card (disabled if only 1 left).

On "Continue":
1. Call `child.create({ ...profileData, guardians })`
2. On success, call `child.updateMedicalHistory({ childId, history: medicalData })` if any medical fields were filled
3. Store `{ id, guards }` in `createdChild`
4. Advance to step 4

#### Step 4 — Consent
Uses `createdChild.id` and `createdChild.guards`.

For each guardian, show a consent card (matching stitch step 4 design):
- Guardian name + relation badge + contact info
- 3 checkboxes: TREATMENT, DATA_PROCESSING, IMAGE_VIDEO_CAPTURE
- Typed name input (italic serif font styling)
- Per-guardian state: `{ typedName: string; selectedTypes: ConsentType[] }`

"Complete Intake" button: for each guardian × each selected type, call `consent.record`. On all settled, navigate to `/children/:childId`.

---

### 3. `children/$childId/index.tsx` — ChildProfilePage

**Data:**
```ts
const { childId } = Route.useParams();
const { data: child } = useQuery(trpc.child.get.queryOptions({ childId }));
const { data: intake } = useQuery(trpc.child.checkIntakeComplete.queryOptions({ childId }));
const { data: consentStatus } = useQuery(trpc.consent.getStatus.queryOptions({ childId }));
```

**Header:** Initials avatar circle, full name, age (computed from DOB), OP number, consent status badge, "Edit" button → `/children/$childId/edit`.

**Tabs (shadcn `<Tabs>`):** Overview | Medical History | Guardians | Consent Records | Assessments (placeholder) | Plans (placeholder) | Sessions (placeholder)

**Overview tab:**
- Intake checklist: iterate `intake.missingFields`, green check or red X per field
- "Start Assessment" button: disabled if `!intake.complete`

**Medical History tab:** Read-only display of `child.medicalHistory` fields.

**Guardians tab:** List each guardian card (name, relation, phone, email).

**Consent Records tab:** Shows `consentStatus.guardians` — per-guardian, per-type status with timestamp. "Withdraw Consent" button (CLINIC_ADMIN only) → `consent.withdraw` mutation + invalidate queries.

Skeleton: full-page skeleton while any query is loading.

---

### 4. `children/$childId/edit.tsx` — EditChildPage

Same form layout as Step 1, fields pre-populated from `child.get`.
Uses `child.update` mutation. On success: invalidate `child.get`, navigate back to profile.

---

### 5. `children/$childId/consent.tsx` — ConsentPage

Standalone consent management page for post-intake use.
Uses same guardian consent card UI as wizard Step 4.
- Pending types → show record consent form
- Granted types → show signed name + timestamp (read-only)
- "Withdraw" button (CLINIC_ADMIN only) per guardian

---

## AppShell Nav Addition

In `apps/web/src/components/shell/AppShell.tsx`, add to `NAV_ITEMS` array:
```ts
{ label: "Children", to: "/children", icon: <Baby />, roles: ["CLINIC_ADMIN", "THERAPIST", "STAFF"] }
```
Import `Baby` from `lucide-react`.

---

## Patterns & Reuse

| Concern | Source to mirror |
|---|---|
| Route + form | `settings/departments/new.tsx` |
| Edit + populate | `settings/departments/$departmentId.tsx` |
| List + table + skeleton | `settings/staff/index.tsx` |
| tRPC import | `import { trpc } from "@/utils/trpc"` |
| Auth store | `import { useAuthStore } from "@/stores/auth"` |
| UI primitives | `@haber-final/ui/components/<name>` |
| Schemas | `@haber-final/api/schemas/child`, `@haber-final/api/schemas/consent` |

**Consent badge classes:**
- GRANTED → `bg-[#DCFCE7] text-[#15803D]`
- PENDING → `bg-[#FEF08A] text-[#854D0E]`
- WITHDRAWN → `bg-red-100 text-red-700`

---

## Verification

1. `pnpm check-types` — must pass with zero errors
2. Run full wizard: fill all 4 steps, submit → child appears in `/children` list
3. Add 2 guardians in step 3 → both visible in Guardians tab on profile page
4. Record TREATMENT consent for all guardians → badge updates to GRANTED, "Start Assessment" button enables
5. As CLINIC_ADMIN, withdraw consent → badge updates to WITHDRAWN
6. Edit child (name/DOB) → changes reflected on profile page
7. Soft-deleted children absent from list for non-admin roles
