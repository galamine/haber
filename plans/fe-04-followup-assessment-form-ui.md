# FE-04: Follow-Up Assessment Form 2 UI — Implementation Plan

## Context

The Haber Specialisto clinical toolkit requires a follow-up assessment (Form 2) conducted every 4–6 sessions. It re-checks the child's 7-system sensory profile against the **initial assessment baseline**, records progress on active goals, and captures qualitative observations and next-period planning. This feature mirrors FE-03 (initial assessment) patterns exactly — same tab shell, same section card / field wrapper primitives, same `zodResolver` + `useFieldArray` + `seededRef` approach — extended with: a baseline-vs-current sensory delta display, goal progress rows seeded from a treatment plan, and a `treatmentPlanId` dependency that requires one small backend addition (`getActivePlan`).

**BE-08 is implemented.** The following are already done and should not be re-created:
- Prisma schema: `SensoryProfile.followUpId`, `GoalProgressEntry` FK relation, `FollowUpAssessment` inverse relations
- Schemas in `packages/api/src/schemas/assessment.ts`: `GoalStatusSchema`, `GoalProgressInputSchema`, `SensoryCheckInputSchema`, `SensoryCheckResultSchema`, `FollowUpSectionA–FSchema`, `CreateFollowUpInput`, `SensoryDeltaSchema`, `FollowUpAssessmentSchema`
- Procedures on `assessmentRouter`: `createFollowUp`, `getFollowUp`, `listFollowUps`, `getFollowUpDelta`

Remaining blocker: FE-03 (initial assessment must exist for baseline pre-population).

---

## Implemented API Schemas (from `packages/api/src/schemas/assessment.ts`)

These are already exported — import, do not redefine:

```
FollowUpSectionASchema:  { date, therapistId, sessionNumber, weeksSinceInitial, parentPresent }
GoalProgressInputSchema: { goalId, attainmentPct (0–100), status ("MET"|"IN_PROGRESS"|"NOT_MET"|"DISCONTINUED"), evidenceNotes }
FollowUpSectionBSchema:  { goalProgress: GoalProgressInputSchema[].min(1) }
SensoryCheckInputSchema: { systemId, rating (1–5), notes }
FollowUpSectionCSchema:  { sensoryCheck: SensoryCheckInputSchema[].length(7) }
FollowUpSectionDSchema:  { improvementsAtHome, improvementsAtSchool, regressions?, homeProgramCompliance,
                           sessionEngagement, schoolPerformanceChanges, behaviourChanges,
                           newSkillsObserved, equipmentEffectivelyUsed (plain string), therapistObservations }
FollowUpSectionESchema:  { goalStatusDecisions: string[], updatedGoals: GoalTemplateSchema[],
                           updatedHomeProgram, nextFollowUpDate, nextAssessmentType, clinicalNotes }
FollowUpSectionFSchema:  { therapistName, therapistCredentials?, therapistIp?, guardianName, guardianIp? }
CreateFollowUpInput:     { childId, initialAssessmentId, treatmentPlanId, previousFollowUpId?, sectionA–F }
SensoryCheckResultSchema: SensoryCheckInputSchema + { baseline, change }  ← shape stored in sectionC JSON
```

**Key facts:**
- `sectionC` input sends only `{ systemId, rating, notes }` — server looks up the baseline from the initial assessment's `SensoryProfile` rows and stores `{ …, baseline, change }`. The FE never sends `baselineRating`.
- `equipmentEffectivelyUsed` is a plain `string` — serialize the multi-select value array to a comma-joined string before the mutation call.
- `FollowUpSectionFSchema` has no `consentObtained` — consent checkbox is a UI-only gate; strip before calling the mutation.
- `goalProgress.min(1)` in the API — frontend form schema relaxes this to `.min(0)`; if the array is empty at submit time, show a toast and jump to Section B.
- `sectionE.goalStatusDecisions` / `updatedGoals` are stored as JSON only — no `Goal` table writes (deferred to BE-09).

---

## One Remaining Backend Addition

**`getActivePlan({ childId })`** — add to `packages/api/src/routers/assessment.ts`:

```ts
getActivePlan: protectedProcedure
  .input(z.object({ childId: z.string() }))
  .query(async ({ input, ctx }) => {
    await getChildForRead(input.childId, ctx);
    return prisma.treatmentPlan.findFirst({
      where: { childId: input.childId, isActive: true },
      include: {
        goals: {
          select: { id: true, description: true, horizon: true, status: true, targetAttainmentPct: true },
        },
      },
    });
  }),
```

This is the unlock for `treatmentPlanId` and Section B goal pre-population without waiting for BE-09/BE-10. Returns `null` if no active plan exists.

---

## Frontend File Structure

```
apps/web/src/
├── routes/_authenticated/children/$childId/followup/
│   ├── new.tsx                  ← create form
│   └── $followUpId.tsx          ← read-only detail
└── features/followup/
    ├── constants.ts
    ├── schema.ts
    ├── types.ts
    ├── use-followup-data.ts
    ├── delta-badge.tsx           ← shared DeltaBadge component
    ├── FollowUpTabsShell.tsx
    ├── sections/
    │   ├── SectionA.tsx
    │   ├── SectionB.tsx
    │   ├── SectionC.tsx
    │   ├── SectionD.tsx
    │   ├── SectionE.tsx
    │   └── SectionF.tsx
    └── read-only/
        ├── ReadOnlySectionA.tsx
        ├── ReadOnlySectionB.tsx
        ├── ReadOnlySectionC.tsx
        ├── ReadOnlySectionD.tsx
        ├── ReadOnlySectionE.tsx
        └── ReadOnlySectionF.tsx
```

**Reuse directly (import, do not copy):**

| Component | Source path |
|---|---|
| `SectionCard` | `features/assessment/SectionCard.tsx` |
| `FieldWrapper` | `features/assessment/FieldWrapper.tsx` |
| `ReadOnlyField` | `features/assessment/read-only/ReadOnlyField.tsx` |
| `MultiSelectCombobox` | `components/multi-select-combobox.tsx` |

**Copy pattern (adapt field paths / tab config):**

| New file | Modelled on | Key difference |
|---|---|---|
| `FollowUpTabsShell.tsx` | `AssessmentTabsShell.tsx` | 6-tab `FOLLOWUP_TABS`; add optional `readOnly` prop |
| `sections/SectionC.tsx` | `features/assessment/sections/SectionD.tsx` | Add baseline column + `DeltaBadge`; `useWatch` for live delta |
| `sections/SectionF.tsx` | `features/assessment/sections/SectionH.tsx` | `sectionF.*` field paths; updated consent wording |
| `sections/SectionE.tsx` (updatedGoals array) | Inner `GoalList` from `features/assessment/sections/SectionG.tsx` | No `targetAttainmentPct` input needed in the row |

---

## Creation Order (strict)

1. `getActivePlan` procedure in `packages/api/src/routers/assessment.ts`
2. `features/followup/constants.ts`
3. `features/followup/schema.ts`
4. `features/followup/types.ts`
5. `features/followup/delta-badge.tsx`
6. `features/followup/use-followup-data.ts`
7. `features/followup/FollowUpTabsShell.tsx`
8. `features/followup/sections/SectionA–F.tsx` (A → B → C → D → E → F)
9. `features/followup/read-only/ReadOnlySectionA–F.tsx`
10. `routes/_authenticated/children/$childId/followup/new.tsx`
11. `routes/_authenticated/children/$childId/followup/$followUpId.tsx`

---

## File-by-File Details

### `features/followup/constants.ts`

```ts
export const FOLLOWUP_TABS = [
  { value: "a", label: "Session Info",          field: "sectionA" },
  { value: "b", label: "Goal Progress",         field: "sectionB" },
  { value: "c", label: "Sensory Progress",      field: "sectionC" },
  { value: "d", label: "Clinical Questions",    field: "sectionD" },
  { value: "e", label: "Plan Adjustments",      field: "sectionE" },
  { value: "f", label: "Signatures & Consent",  field: "sectionF" },
] as const;
export type FollowUpTabValue = (typeof FOLLOWUP_TABS)[number]["value"];

export const COMPLIANCE_OPTIONS = [
  { value: "excellent", label: "Excellent" },
  { value: "good",      label: "Good" },
  { value: "partial",   label: "Partial" },
  { value: "minimal",   label: "Minimal" },
  { value: "not_started", label: "Not Started" },
] as const;

export const ENGAGEMENT_OPTIONS = [
  { value: "excellent", label: "Excellent" },
  { value: "good",      label: "Good" },
  { value: "fair",      label: "Fair" },
  { value: "poor",      label: "Poor" },
] as const;

export const GOAL_STATUS_OPTIONS = [
  { value: "MET",          label: "Goal Met" },
  { value: "IN_PROGRESS",  label: "In Progress" },
  { value: "NOT_MET",      label: "Not Met" },
  { value: "DISCONTINUED", label: "Discontinued" },
] as const;

export const GOAL_STATUS_DECISION_OPTIONS = [
  { value: "continue_all",        label: "Continue all current goals" },
  { value: "modify_existing",     label: "Modify existing goals" },
  { value: "add_new",             label: "Add new goals" },
  { value: "discontinue",         label: "Discontinue goals" },
  { value: "refer_to_specialist", label: "Refer to specialist" },
] as const;

export const NEXT_ASSESSMENT_TYPE_OPTIONS = [
  { value: "follow_up", label: "Follow-Up Assessment" },
  { value: "discharge",  label: "Discharge Assessment" },
  { value: "annual",     label: "Annual Review" },
] as const;
```

---

### `features/followup/schema.ts`

Import the already-exported BE-08 schemas from `@haber-final/api/schemas/assessment`. Build a thin form-layer schema with two display-layer extensions that get stripped before submission:

```ts
import {
  FollowUpSectionASchema, FollowUpSectionBSchema, FollowUpSectionCSchema,
  FollowUpSectionDSchema, FollowUpSectionESchema, FollowUpSectionFSchema,
  GoalProgressInputSchema,
} from "@haber-final/api/schemas/assessment";

export const FollowUpFormSchema = z.object({
  sectionA: FollowUpSectionASchema,
  sectionB: FollowUpSectionBSchema.extend({
    goalProgress: z.array(GoalProgressInputSchema), // relaxed: no .min(1) until active plan exists
  }),
  sectionC: FollowUpSectionCSchema,
  sectionD: FollowUpSectionDSchema.extend({
    equipmentEffectivelyUsed: z.array(z.string()), // multi-select in UI; joined to string on submit
  }),
  sectionE: FollowUpSectionESchema,
  sectionF: FollowUpSectionFSchema.extend({
    consentObtained: z.literal(true), // UI gate only; stripped before mutation call
  }),
});
export type FollowUpFormValues = z.infer<typeof FollowUpFormSchema>;
```

**`buildFollowUpDefaultValues({ initialAssessment, therapistId, sessionNumber, activePlan })`:**
- `sectionA`: `therapistId` from `auth.me.id`; `weeksSinceInitial` = `Math.round((Date.now() - new Date(initialAssessment.createdAt)) / (7*24*60*60*1000))`; `sessionNumber` from `listFollowUps.length + 1`; `date` = today ISO string
- `sectionC.sensoryCheck`: `initialAssessment.sectionD.sensoryProfile.map(r => ({ systemId: r.systemId, rating: r.rating, notes: "" }))` — defaults current = baseline so delta starts at 0
- `sectionB.goalProgress`: `(activePlan?.goals ?? []).filter(g => g.status === "IN_PROGRESS").map(g => ({ goalId: g.id, attainmentPct: 0, status: "IN_PROGRESS", evidenceNotes: "" }))`

**Baseline is NOT stored in form state.** Keep as `const baselineMap: Record<string, number>` derived from `initialAssessment.sectionD.sensoryProfile` in the route, passed as a prop to `SectionC` for display only.

**`onValid` serialization before `mutation.mutate`:**
- `sectionD.equipmentEffectivelyUsed`: join array → `", "`-delimited string
- `sectionF`: omit `consentObtained`

---

### `features/followup/types.ts`

```ts
export type FollowUpSectionProps = {
  register: UseFormRegister<FollowUpFormValues>;
  control: Control<FollowUpFormValues>;
  errors: FieldErrors<FollowUpFormValues>;
};
```

---

### `features/followup/delta-badge.tsx`

Extracted so both `SectionC` (live) and `ReadOnlySectionC` (stored) can import it.

```tsx
// Lower sensory rating = clinically better → negative delta = improvement
export function DeltaBadge({ delta }: { delta: number }) {
  if (delta < 0)
    return <span className="text-green-600 text-xs font-medium bg-green-50 border border-green-200 rounded px-2 py-0.5">Improved ({delta})</span>;
  if (delta > 0)
    return <span className="text-red-600 text-xs font-medium bg-red-50 border border-red-200 rounded px-2 py-0.5">Increased (+{delta})</span>;
  return <span className="text-muted-foreground text-xs bg-surface-variant rounded px-2 py-0.5">Unchanged (0)</span>;
}
```

---

### `features/followup/use-followup-data.ts`

```ts
export function useFollowUpData({ childId }: { childId: string }) {
  const therapistMe       = useQuery(trpc.auth.me.queryOptions());
  const initialAssessment = useQuery({
    ...trpc.assessment.get.queryOptions({ childId }),
    retry: false,
    meta: { suppressErrorToast: true },
  });
  const followUps         = useQuery(trpc.assessment.listFollowUps.queryOptions({ childId }));
  const activePlan        = useQuery(trpc.assessment.getActivePlan.queryOptions({ childId }));
  const equipment         = useQuery(trpc.taxonomy.listEquipment.queryOptions());
  const sensorySystems    = useQuery(trpc.taxonomy.listSensorySystems.queryOptions());

  const isLoading = [therapistMe, initialAssessment, followUps, activePlan, equipment, sensorySystems]
    .some(q => q.isLoading);

  return { therapistMe, initialAssessment, followUps, activePlan, equipment, sensorySystems, isLoading };
}
```

Goals come from `activePlan.data.goals` — no `trpc.goal.list` call needed.

---

### `features/followup/FollowUpTabsShell.tsx`

Copy `AssessmentTabsShell.tsx` verbatim; replace:
- `SECTION_TABS` → `FOLLOWUP_TABS`; `SectionTabValue` → `FollowUpTabValue`
- Submit button label: `"Submit Follow-Up"`
- Add `readOnly?: boolean` prop — when true, hide the Submit button (used by detail page)

---

### `sections/SectionA.tsx` — Session Info

- `date`: `Input type="date"` via `register("sectionA.date")`
- `therapistId`: `<input type="hidden" {...register("sectionA.therapistId")} />` + display-only `<p className="pt-2 text-on-surface-variant text-sm">{therapistDisplayName}</p>`
- `sessionNumber`: number `Input` via `register`
- `weeksSinceInitial`: number `Input`, `readOnly`, `className="bg-muted cursor-not-allowed"`
- `parentPresent`: `Controller` + `Switch`

Extra prop: `therapistDisplayName: string`

---

### `sections/SectionB.tsx` — Goal Progress Review

`useFieldArray({ control, name: "sectionB.goalProgress" })`.

**Empty state** when `fields.length === 0`:
```tsx
<SectionCard title="Section B — Goal Progress Review">
  <div className="md:col-span-2 rounded-lg border border-outline-variant p-6 text-center">
    <p className="text-on-surface-variant text-sm">
      No active treatment plan goals found. Goals will auto-populate once an active plan with goals is configured.
    </p>
  </div>
</SectionCard>
```

**Each goal row** — `rounded-lg border border-outline-variant p-4`:
- Header: `<p className="font-medium text-sm">{goalDescriptionById[field.goalId]}</p>`
- `attainmentPct`: `Controller` + `Slider` (min=0, max=100, step=1) + inline `{value}%` label
- `status`: `Controller` + `Select` using `GOAL_STATUS_OPTIONS`
- `evidenceNotes`: `Textarea rows={2}` via `register`

Extra prop: `goalDescriptionById: Record<string, string>`

---

### `sections/SectionC.tsx` — Sensory Progress Check

Copy `features/assessment/sections/SectionD.tsx` structure. Replace the single slider column with a three-column table.

`useFieldArray({ control, name: "sectionC.sensoryCheck" })` (fixed-length 7).
`const watchedCheck = useWatch({ control, name: "sectionC.sensoryCheck" })` for live delta.

**Table columns: System | Baseline | Current Rating | Change**

```tsx
{fields.map((field, idx) => {
  const baseline = baselineMap[field.systemId] ?? 0;
  const current  = watchedCheck?.[idx]?.rating ?? baseline;
  return (
    <TableRow key={field.id}>
      <TableCell>{sensorySystemById[field.systemId]}</TableCell>
      <TableCell>
        <span className="text-on-surface-variant text-sm">{baseline} / 5</span>
      </TableCell>
      <TableCell>
        <Controller control={control} name={`sectionC.sensoryCheck.${idx}.rating`}
          render={({ field: f }) => (
            <Slider min={1} max={5} step={1} value={[f.value]} onValueChange={([v]) => f.onChange(v)} />
          )}
        />
      </TableCell>
      <TableCell><DeltaBadge delta={current - baseline} /></TableCell>
    </TableRow>
  );
})}
```

Also render a `notes` `Textarea` below each row via `register(`sectionC.sensoryCheck.${idx}.notes`)`.

Extra props: `sensorySystemById: Record<string, string>; baselineMap: Record<string, number>`

---

### `sections/SectionD.tsx` — Follow-Up Clinical Questions

All textareas via `register`. `Controller` for RadioGroups and MultiSelectCombobox.

- `improvementsAtHome` + `improvementsAtSchool`: two `Textarea rows={3}` fields
- `regressions`: `Textarea rows={2}`
- `homeProgramCompliance`: `Controller` + `RadioGroup` with `COMPLIANCE_OPTIONS` (5 items)
- `sessionEngagement`: `Controller` + `RadioGroup` with `ENGAGEMENT_OPTIONS` (4 items)
- `schoolPerformanceChanges`, `behaviourChanges`, `newSkillsObserved`: `Textarea rows={2}` each
- `equipmentEffectivelyUsed`: `Controller` + `MultiSelectCombobox` — form holds `string[]`, serialized to comma string on submit
- `therapistObservations`: `Textarea rows={4}`

Extra prop: `equipmentOptions: { value: string; label: string }[]`

---

### `sections/SectionE.tsx` — Plan Adjustments & Next Steps

- `goalStatusDecisions`: `Controller` + manual checkbox toggle array — same pattern as `features/assessment/sections/SectionE.tsx`'s `functionalConcerns` grid. Render `GOAL_STATUS_DECISION_OPTIONS` (5 items).
- `updatedGoals`: `useFieldArray` on `sectionE.updatedGoals`. Per row: `Input` for `description` + remove `Button`. Append: `{ goalId: crypto.randomUUID(), description: "", targetAttainmentPct: 100 }`. Copy the inner `GoalList` pattern from `features/assessment/sections/SectionG.tsx`.
- `updatedHomeProgram`: `Textarea rows={3}`
- `nextFollowUpDate`: `Input type="date"` via `register`
- `nextAssessmentType`: `Controller` + `Select` with `NEXT_ASSESSMENT_TYPE_OPTIONS`
- `clinicalNotes`: `Textarea rows={4}`

---

### `sections/SectionF.tsx` — Signatures & Consent

Near-identical to `features/assessment/sections/SectionH.tsx`. Differences:
- Field paths: `sectionF.*`
- Consent text: "I confirm the information in this follow-up assessment is accurate to my clinical judgment. Progress and updated plan have been discussed with the caregiver (if present)."
- `consentObtained`: `Controller` + `Checkbox` (UI gate; stripped before API call)

Extra prop: `therapistCredentials?: string`

---

### Read-Only Components

All import `ReadOnlyField` from `features/assessment/read-only/ReadOnlyField.tsx` and `SectionCard` from `features/assessment/SectionCard.tsx`.

**`ReadOnlySectionA`**: Grid of `ReadOnlyField`. `parentPresent` → "Yes" / "No".

**`ReadOnlySectionB`**: Empty state if `goalProgress.length === 0`. Otherwise `Table` (Goal | Attainment | Status | Evidence Notes) with colour-coded status `Badge`.

**`ReadOnlySectionC`**: Table (System | Baseline | Current | Change). `change` comes directly from stored `SensoryCheckResultSchema` — no recomputation needed. Use `<DeltaBadge delta={entry.change} />`.

Props: `{ data: { sensoryCheck: SensoryCheckResult[] }; sensorySystemById: Record<string, string> }`

**`ReadOnlySectionD`**: `ReadOnlyField` for each textarea. Look up display labels from `COMPLIANCE_OPTIONS` / `ENGAGEMENT_OPTIONS` for the radio fields. `equipmentEffectivelyUsed` displayed as-is (already a plain string from the API).

**`ReadOnlySectionE`**: Join `goalStatusDecisions` values → labels from `GOAL_STATUS_DECISION_OPTIONS`. List `updatedGoals[].description` as a bullet list. Look up `nextAssessmentType` label from `NEXT_ASSESSMENT_TYPE_OPTIONS`.

**`ReadOnlySectionF`**: `therapistName`, `therapistCredentials`, `guardianName`. Consent: always "Yes" for stored records.

---

### `routes/_authenticated/children/$childId/followup/new.tsx`

```ts
export const Route = createFileRoute(
  "/_authenticated/children/$childId/followup/new"
)({ component: NewFollowUpPage });
```

**`NewFollowUpPage` logic:**

1. `const { childId } = Route.useParams()`
2. `const data = useFollowUpData({ childId })`
3. `useForm<FollowUpFormValues>({ resolver: zodResolver(FollowUpFormSchema), defaultValues: FOLLOWUP_EMPTY_DEFAULTS })`
4. **`seededRef` pattern** — fires once when `!data.isLoading && data.initialAssessment.data`:
   ```ts
   form.reset(buildFollowUpDefaultValues({
     initialAssessment: data.initialAssessment.data,
     therapistId: data.therapistMe.data?.id ?? "",
     sessionNumber: (data.followUps.data?.length ?? 0) + 1,
     activePlan: data.activePlan.data,
   }));
   form.setValue("sectionF.therapistName", data.therapistMe.data?.email ?? "");
   ```
5. **Gate — no initial assessment**: if `data.initialAssessment.isError`, render a blocking panel: "Initial Assessment Required" + `Button` linking to `/children/$childId/assessment/new`
6. `const mutation = useMutation(trpc.assessment.createFollowUp.mutationOptions({ onSuccess: result => navigate to detail page }))`
7. **`onValid`**: guard empty goal list (toast + jump to "b" tab if `values.sectionB.goalProgress.length === 0`); then serialize and call:
   ```ts
   mutation.mutate({
     childId,
     initialAssessmentId: data.initialAssessment.data!.id,
     treatmentPlanId: data.activePlan.data!.id,
     sectionA: values.sectionA,
     sectionB: values.sectionB,
     sectionC: values.sectionC,
     sectionD: {
       ...values.sectionD,
       equipmentEffectivelyUsed: values.sectionD.equipmentEffectivelyUsed.join(", "),
     },
     sectionE: values.sectionE,
     sectionF: {
       therapistName: values.sectionF.therapistName,
       guardianName:  values.sectionF.guardianName,
       // credentials and IPs populated server-side
     },
   });
   ```
8. **`onInvalid`**: `setSubmitAttempted(true)`, jump to first errored tab
9. `errorTabs`: `new Set(FOLLOWUP_TABS.filter(t => errors[t.field]).map(t => t.value))` — only computed after `submitAttempted`
10. **Lookup maps** for section props:
    - `sensorySystemById` from `data.sensorySystems.data`
    - `baselineMap` from `data.initialAssessment.data?.sectionD.sensoryProfile`
    - `equipmentOptions` from `data.equipment.data`
    - `goalDescriptionById` from `data.activePlan.data?.goals`
    - `therapistDisplayName` from `data.therapistMe.data?.email`
    - `therapistCredentials` — join `credentialsQualifications + credentialsRegistrationNumber` from `data.therapistMe.data` (same pattern as `assessment/new.tsx`)

---

### `routes/_authenticated/children/$childId/followup/$followUpId.tsx`

```ts
export const Route = createFileRoute(
  "/_authenticated/children/$childId/followup/$followUpId"
)({ component: FollowUpDetailPage });
```

1. `useQuery(trpc.assessment.getFollowUp.queryOptions({ followUpId }))`
2. `useFollowUpData({ childId })` for lookup maps
3. `castSection<T>(v: unknown): T` — copy from `assessment/$assessmentId.tsx`
4. Cast `followUp.sectionC` to `{ sensoryCheck: SensoryCheckResult[] }` — delta already computed and stored by the server
5. Render `<FollowUpTabsShell readOnly activeTab={activeTab} onTabChange={setActiveTab} sections={{ ... }} />`

---

## Sensory Delta — Full Data Flow

| Phase | Location | What happens |
|---|---|---|
| Seed | `buildFollowUpDefaultValues` | `sensoryCheck[i].rating = initialAssessment.sectionD.sensoryProfile[i].rating` — delta starts at 0 |
| Display (form) | `SectionC.tsx` | `baselineMap` prop shows baseline text; slider edits `rating`; `useWatch` feeds live `DeltaBadge` |
| Submit | `onValid` | Sends `{ systemId, rating, notes }` — no `baselineRating` |
| Store | Server (`createFollowUp`) | Enriches to `{ systemId, rating, notes, baseline, change }` in `sectionC` JSON |
| Display (detail) | `ReadOnlySectionC` | Reads `entry.baseline`, `entry.rating`, `entry.change` directly — no recomputation |

---

## Verification

1. `pnpm check-types` — must pass across all packages (explicit AC)
2. `pnpm check` — Biome on all new/edited files
3. **New form smoke test** (`/children/:childId/followup/new`):
   - Section A: therapist name displays read-only; `weeksSinceInitial` is read-only; Switch toggles
   - Section B: goals appear from active plan's `IN_PROGRESS` goals; empty-state banner if no plan
   - Section C: baseline column read-only; slider updates current rating; `DeltaBadge` updates live
   - Section D: both RadioGroups work; MultiSelectCombobox works for equipment
   - Section E: goal-status checkboxes toggle; `updatedGoals` field array appends/removes
   - Section F: consent checkbox blocks submission when unchecked; red-dot error tab on invalid submit
   - Successful submit → redirect to detail page
4. **Detail page smoke test** (`/children/:childId/followup/:followUpId`):
   - All 6 sections render read-only; Section C shows baseline/current/change with correct `DeltaBadge` colours
5. **Edge case**: `/followup/new` with no initial assessment → blocking panel with link to create one
