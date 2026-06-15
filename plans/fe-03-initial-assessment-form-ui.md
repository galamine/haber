# FE-03: Initial Assessment Form 1 UI (8 Sections)

## Context

BE-07 (Initial Assessment API) is done — `assessment.create/get/list/review`, taxonomy queries, and `milestone.list` all exist in `packages/api`. FE-02 (child profile) is also done. This task builds the two missing routes: a create form (`assessment/new.tsx`) covering all 8 sections of the Haber Specialisto initial assessment, and a read-only detail view (`assessment/$assessmentId.tsx`).

Two small adjacent gaps were found during research and are included in scope:
1. **No endpoint for a logged-in user to read their own profile** — `staff.get`/`staff.list` are clinic-admin-only, and the `User` model has no `name` field (only `email`, `credentialsQualifications`, `credentialsRegistrationNumber`). Section H needs to show the therapist's identity/credentials, so we add a tiny `auth.me` query.
2. **`previousTherapies` is a single `string`** in the BE-07 schema, but the stitch design and issue want a repeatable add/remove row UI (Therapy Type / Duration / Provider). We build the row UI locally and serialize to a string on submit.

Also: there is no `taxonomy.listInterventionSettings` endpoint — `sectionG.interventionSetting` is a free `string`, so we hardcode the 6 options from `clinical-data/clinical-taxonomies.seed.json` → `intervention_settings`.

## 0. Backend addition: `auth.me`

**File:** `packages/api/src/routers/auth.ts` — add at the end of `authRouter` (prisma + protectedProcedure already imported):

```ts
me: protectedProcedure.query(async ({ ctx }) => {
	return prisma.user.findUniqueOrThrow({
		where: { id: ctx.auth.userId },
		select: {
			email: true,
			credentialsQualifications: true,
			credentialsRegistrationNumber: true,
		},
	});
}),
```

No router registration changes needed (`appRouter.auth` already exists). Frontend calls `trpc.auth.me.queryOptions()`.

## 0b. Small `trpc.ts` edit (suppress one expected toast)

**File:** `apps/web/src/utils/trpc.ts` — `new.tsx` needs to check whether an assessment already exists via `assessment.get({childId})`, which throws `NOT_FOUND` when none exists (the expected first-visit case). The global `QueryCache.onError` would toast this every time. Add a `meta` check:

```ts
onError: (error, query) => {
	if (query.meta?.suppressErrorToast) return;
	toast.error(error.message, {
		action: { label: "retry", onClick: query.invalidate },
	});
},
```

Then pass `meta: { suppressErrorToast: true }` in the `useQuery` options for the existence-check in `new.tsx`.

## 1. File structure

```
apps/web/src/routes/_authenticated/children/$childId/assessment/
  new.tsx                    — create route: useForm, tab shell, submit
  $assessmentId.tsx          — detail route: query + read-only render

apps/web/src/features/assessment/
  schema.ts                  — AssessmentFormSchema, defaults, types
  constants.ts               — SECTION_TABS, INTERVENTION_SETTINGS
  use-assessment-taxonomy.ts — bundles all taxonomy/milestone/auth.me queries
  AssessmentTabsShell.tsx    — Tabs/TabsList (8 tabs) + progress bar, shared
  sections/
    SectionA.tsx ... SectionH.tsx   — editable section components
  read-only/
    ReadOnlyField.tsx          — shared <dt>/<dd> primitive
    ReadOnlySectionA.tsx ... ReadOnlySectionH.tsx

apps/web/src/components/
  multi-select-combobox.tsx  — generic Command+Popover+Badge multi-select
```

Reuse `SectionASchema`...`SectionHSchema` etc. directly from `@haber-final/api/schemas/assessment` (same import pattern as `MedicalHistoryInput` in `children/new.tsx`) so the form schema stays in sync with the API contract.

Editable sections use react-hook-form (`register`/`Controller`/`useFieldArray`) against one big `useForm<AssessmentFormValues>`. Read-only sections are separate, form-free components that take the raw `InitialAssessment.sectionX` JSON + taxonomy label maps and render `<dl>`/table displays — threading a `readOnly` prop through every field would roughly double each section's JSX, so a parallel lightweight renderer is simpler. Both share `use-assessment-taxonomy.ts` (label lookups) and `AssessmentTabsShell.tsx`.

## 2. Master Zod schema (`features/assessment/schema.ts`)

```ts
import {
	SectionASchema, SectionBSchema, SectionCSchema, SectionDSchema,
	SectionESchema, SectionFSchema, SectionGSchema, SectionHSchema,
} from "@haber-final/api/schemas/assessment";
import { z } from "zod";

export const PreviousTherapyRowSchema = z.object({
	therapyType: z.string(),
	durationFrequency: z.string(),
	providerLocation: z.string(),
});

export const SectionBFormSchema = SectionBSchema.omit({
	previousTherapies: true,
}).extend({
	previousTherapiesRows: z.array(PreviousTherapyRowSchema),
});

export const AssessmentFormSchema = z.object({
	sectionA: SectionASchema,
	sectionB: SectionBFormSchema,
	sectionC: SectionCSchema,   // .min(1) — satisfied by seeding 12 milestones
	sectionD: SectionDSchema,   // .length(7) — satisfied by seeding 7 sensory systems
	sectionE: SectionESchema,
	sectionF: SectionFSchema,
	sectionG: SectionGSchema,
	sectionH: SectionHSchema,   // consentObtained: z.literal(true)
});

export type AssessmentFormValues = z.infer<typeof AssessmentFormSchema>;
```

`buildDefaultValues({ child, sensorySystems, milestones })` produces the seeded defaults:
- `sectionA`: `patientName = child.fullName`, `dob = child.dob`, `gender = child.sex`, `age` computed from DOB, rest empty strings.
- `sectionC.milestones`: one entry per `milestone.list` item — `{ milestoneId: id, achievedAtAgeMonths: undefined, delayed: false, notes: "" }` (12 items).
- `sectionD.sensoryProfile`: one entry per `taxonomy.listSensorySystems` item — `{ systemId: id, rating: 3, notes: "" }` (7 items, in returned order).
- Everything else: empty strings/arrays/zero numbers; `sectionB.previousTherapiesRows: []`; `sectionH.consentObtained: false`.

Note: `consentObtained` is typed `z.literal(true)` but the RHF default must be `false` (unchecked checkbox) — zodResolver will simply produce a validation error until checked. That's the desired UX.

## 3. `MultiSelectCombobox` (`apps/web/src/components/multi-select-combobox.tsx`)

Generic component built from `Popover` + `Command` + `Badge` (all confirmed present in `packages/ui`). Props:

```ts
type Option = { value: string; label: string };
type Props = {
	options: Option[];
	value: string[];
	onChange: (value: string[]) => void;
	placeholder?: string;
};
```

Renders a `Button`-triggered `Popover` containing a `Command`/`CommandInput`/`CommandList`/`CommandGroup` of `CommandItem`s (checkmark toggles membership in `value`), plus removable `Badge` chips below for selected items. Used via `Controller` for:
- `sectionB.primaryDiagnoses` (options from `taxonomy.listDiagnoses`)
- `sectionG.equipment` (options from `taxonomy.listEquipment`)

## 4. Taxonomy hook (`features/assessment/use-assessment-taxonomy.ts`)

One hook bundling all the queries both routes need:

```ts
export function useAssessmentTaxonomy() {
	const diagnoses = useQuery(trpc.taxonomy.listDiagnoses.queryOptions());
	const sensorySystems = useQuery(trpc.taxonomy.listSensorySystems.queryOptions());
	const functionalConcerns = useQuery(trpc.taxonomy.listFunctionalConcerns.queryOptions());
	const assessmentTools = useQuery(trpc.taxonomy.listAssessmentTools.queryOptions());
	const equipment = useQuery(trpc.taxonomy.listEquipment.queryOptions());
	const milestones = useQuery(trpc.milestone.list.queryOptions());
	const therapistMe = useQuery(trpc.auth.me.queryOptions());

	const isLoading = [diagnoses, sensorySystems, functionalConcerns, assessmentTools, equipment, milestones, therapistMe]
		.some((q) => q.isLoading);

	return { diagnoses, sensorySystems, functionalConcerns, assessmentTools, equipment, milestones, therapistMe, isLoading };
}
```

## 5. Section-by-section implementation notes

- **Section A** — 2-col grid of text/date inputs (assessmentDate, location, referringTherapist, referralSource, caregiverName/Relation/Contact/Email, chiefComplaint textarea). `patientName`/`dob`/`gender`/`age` pre-filled from `child.get` via `buildDefaultValues` (still editable, per stitch design which shows them in a read-only-styled card but the schema has no separate "locked" concept — render as normal inputs, pre-filled).

- **Section B** — `MultiSelectCombobox` for `primaryDiagnoses`; textareas for `prenatalHistory`/`birthHistory`/`neonatalHistory`/`medicalHistory`/`currentMedications`/`allergies`; number input for `gestationalAgeWeeks` (optional, 20-45 hint range); **Previous Therapies** repeatable rows via `useFieldArray({ control, name: "sectionB.previousTherapiesRows" })` — same pattern as `Step3Guardians` in `children/new.tsx` (Therapy Type / Duration-Frequency / Provider-Location inputs + remove button + "Add Therapy" button, default 0 rows).

- **Section C** — `useFieldArray({ control, name: "sectionC.milestones" })`, display-only (no add/remove — fixed 12 from seeding). Table per milestone: description (from `milestone.list`, via `milestoneById` map) | `achievedAtAgeMonths` number input | `delayed` checkbox (`Controller`) | `notes` text input.

- **Section D** — `useFieldArray({ control, name: "sectionD.sensoryProfile" })`, display-only (fixed 7 from seeding). Per system: label (from `taxonomy.listSensorySystems`), `Slider` (`min={1} max={5} step={1}`) via `Controller` bound to `rating`, with "1 = Hypo · 3 = Typical · 5 = Hyper" endpoint labels, `notes` textarea. Plus `behaviouralObservations` full-width textarea.

- **Section E** — `Controller` on `sectionE.functionalConcerns` (string[]), 16-item 2-col checkbox grid from `taxonomy.listFunctionalConcerns`, toggling membership in the array manually (push/filter). Plus `observations` textarea.

- **Section F** — `useFieldArray({ control, name: "sectionF.toolsAdministered" })`. 14-item checkbox list from `taxonomy.listAssessmentTools`; checking a tool `append({ toolId, scoresSummary: "" })`, unchecking finds its index and `remove(idx)`. Checked items show an inline `Textarea` for `scoresSummary`. Plus `overallSummary` textarea.

- **Section G** — `shortTermGoals`/`longTermGoals`: `useFieldArray` each, add/remove rows (`{ goalId: crypto.randomUUID(), description, targetAttainmentPct }`), cap at 4 via disabling "Add" once `fields.length === 4` (per issue: "up to 4"). Number inputs for `recommendedFrequency`, `sessionDurationMinutes`, `reviewPeriodWeeks`. `interventionSetting` as a `Select` with hardcoded options from `constants.ts`:
  ```ts
  export const INTERVENTION_SETTINGS = [
  	{ value: "ot_clinic", label: "OT Clinic" },
  	{ value: "home", label: "Home" },
  	{ value: "school", label: "School" },
  	{ value: "early_intervention", label: "Early Intervention Programme" },
  	{ value: "pediatric_rehab", label: "Pediatric Rehabilitation Clinic" },
  	{ value: "hybrid", label: "Hybrid (combination)" },
  ];
  ```
  `homeProgramRecommendations`/`referrals` textareas; `equipment` via `MultiSelectCombobox` (from `taxonomy.listEquipment`).

- **Section H** — `therapistName` text input, defaulted from `taxonomy.therapistMe.data?.email` (editable, "typed name" requirement). Read-only display line for credentials: join `credentialsQualifications` + `credentialsRegistrationNumber` from `auth.me`. Static text "Recorded automatically at submission" in place of timestamp/IP (both are server-overwritten regardless — no client capture). `guardianName` text input. `consentObtained` checkbox via `Controller`, required true. Both `therapistName` and `guardianName` plus the checkbox are required before submit (acceptance criterion).

## 6. Tab shell, validation, progress (`AssessmentTabsShell.tsx` + `constants.ts`)

```ts
export const SECTION_TABS = [
	{ value: "a", label: "Patient & Referral", field: "sectionA" },
	{ value: "b", label: "Medical History", field: "sectionB" },
	{ value: "c", label: "Milestones", field: "sectionC" },
	{ value: "d", label: "Sensory Profile", field: "sectionD" },
	{ value: "e", label: "Functional Concerns", field: "sectionE" },
	{ value: "f", label: "Assessment Tools", field: "sectionF" },
	{ value: "g", label: "Goals & Intervention", field: "sectionG" },
	{ value: "h", label: "Signatures & Consent", field: "sectionH" },
] as const;
```

- 8 `TabsTrigger`s rendered from `SECTION_TABS`, controlled `activeTab` state.
- `Progress` bar value = `((currentIdx + 1) / 8) * 100` — simple index-based, not error-based (avoids premature/misleading validation on untouched tabs).
- Each tab's content has Back/Next buttons that just move `activeTab` (no per-tab validation gate — keeps navigation frictionless).
- Final tab's button is "Submit Assessment" → `handleSubmit(onValid, onInvalid)`.
- `onInvalid(formErrors)`: set `submitAttempted = true`, find the first `SECTION_TABS` entry whose `field` key exists in `formErrors`, jump `activeTab` to it, and `toast.error("Please fix the highlighted errors before submitting.")`.
- `errorTabs` (computed only after `submitAttempted`): `Set` of tab values whose section has an error — render a small red dot on those `TabsTrigger`s. `$assessmentId.tsx` passes an empty set (no errors possible in read-only view).
- Radix `Tabs`/`TabsContent` keeps inactive content mounted (uses `hidden`, not unmount), so `handleSubmit` validates all 8 sections regardless of active tab — no extra wiring needed.

## 7. `new.tsx` — page flow

1. `Route.useParams()` → `childId`.
2. `useQuery(trpc.child.get.queryOptions({ childId }))` — for prefill + consent check.
3. **Consent gate**: if `child.consentStatus !== "GRANTED"`, render a blocking message ("Consent must be granted before creating an assessment") with a button to `/children/$childId/consent`, instead of the form.
4. **Existing-assessment check**: `useQuery({ ...trpc.assessment.get.queryOptions({ childId }), retry: false, meta: { suppressErrorToast: true } })`. If `data` resolves (assessment exists), `useEffect` → `router.navigate({ to: "/children/$childId/assessment/$assessmentId", params: { childId, assessmentId: data.id } })`. `NOT_FOUND` error is expected and ignored (no toast, per §0b).
5. `useAssessmentTaxonomy()` for all option lists + `auth.me`.
6. `useForm<AssessmentFormValues>({ resolver: zodResolver(AssessmentFormSchema), defaultValues: EMPTY_DEFAULTS })`. Once `child` + taxonomy data are loaded (and existing-assessment check resolved to "none"), `reset(buildDefaultValues({...}))` once via a `seededRef` guard (avoid re-seeding on refetch, which would wipe edits).
7. Render `AssessmentTabsShell` with the 8 `SectionX` components inside `TabsContent`s, each given `control`, `register`, `errors` as needed.
8. Submit (`onValid`): serialize `previousTherapiesRows` → `previousTherapies` string (one line per row: `"<type> — <duration/frequency> — <provider/location>"`), strip `previousTherapiesRows` from the payload, assemble `CreateAssessmentInput`-shaped object, call `createMutation.mutate(...)`.
9. `createMutation` (`trpc.assessment.create.mutationOptions`): `onSuccess` → toast + navigate to `/children/$childId/assessment/$assessmentId` with `params: { childId, assessmentId: data.id }`. `onError` → branch on `err.data?.code` (`CONFLICT` → "assessment already exists" toast + redirect via existing-assessment refetch; `PRECONDITION_FAILED` → consent toast; else generic `err.message` toast).

## 8. `$assessmentId.tsx` — detail page

1. `Route.useParams()` → `childId`, `assessmentId`.
2. `useAssessmentTaxonomy()` for label maps.
3. `useQuery(trpc.assessment.get.queryOptions({ childId }))` — returns the latest version (no get-by-id endpoint exists; `assessmentId` param is informational since only one assessment exists per child by construction).
4. Loading → skeleton; `NOT_FOUND` → "not found" state with link back to child profile (real error here, toast is fine).
5. Render `AssessmentTabsShell` (errorTabs empty) with 8 `ReadOnlySectionX` components, each fed `assessment.sectionX` + relevant label maps (milestones, sensory systems, diagnoses, functional concerns, tools, equipment, intervention settings).
6. `ReadOnlyField` (`<dt>`/`<dd>` pair, "—" for empty) used throughout; arrays (milestones, sensory ratings, tools, goals) rendered as small tables/lists with ID→label resolution.

## 9. Styling conventions (match existing routes)

- Tabs/double quotes (Biome), `cn()` from `@haber-final/ui/lib/utils`.
- Section card: `rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm` with header (`border-b px-6 py-4`, `<h2 className="font-semibold text-on-surface text-xl">`) and content (`grid grid-cols-1 gap-x-6 gap-y-5 p-6 md:grid-cols-2`).
- Field: `<div className="flex flex-col gap-1.5"><Label>...</Label><Input {...register(...)} className={errors.x ? "border-red-500" : ""}/>{errors.x && <p className="text-red-600 text-xs">{errors.x.message}</p>}</div>`.
- Semantic tokens only (`bg-surface`, `text-on-surface-variant`, `border-outline-variant`, `bg-brown-*` for primary/active states) — no raw hex.

## Verification

1. `pnpm db:start` (if not running) then `pnpm dev:server` + `pnpm dev:web`.
2. Navigate to a child with `consentStatus: GRANTED` and no existing assessment → `/dashboard/children/:childId/assessment/new` should load with Section A pre-filled (name/DOB/age/sex) and a "0/8 → 8/8" progress bar across tabs.
3. Click through all 8 tabs; confirm Section C shows 12 milestones, Section D shows 7 sliders with Hypo/Typical/Hyper labels, Section E/F render checkbox lists from taxonomy, Section G goal rows can be added/removed (max 4 each), Section H shows therapist email + credentials from `auth.me` and requires guardian name + consent checkbox.
4. Submit with Section C/H incomplete → verify it jumps to the first errored tab with a red-dot indicator and a toast.
5. Submit a fully valid form → verify redirect to `/dashboard/children/:childId/assessment/:assessmentId` showing all 8 sections read-only with correct values (cross-check against `clinical-data/initial-assessment.example.json` field mapping).
6. Reload `new.tsx` for the same child → should auto-redirect to the existing assessment's detail page (no spurious "not found" toast).
7. Test consent gate: a child with `consentStatus !== GRANTED` visiting `new.tsx` sees the blocking message, not the form.
8. `pnpm check-types` passes.

## Blocked by

- BE-07 (Initial assessment API) — done
- FE-02 (Child profile page) — done
