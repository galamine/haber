# FE-03: Initial Assessment Form 1 UI (8 Sections)

## What to build

Build the *Haber Specialisto* initial assessment form UI. All 8 sections must be implemented. Expected completion time: 45–60 min for the end user, so the form must be well-structured with clear section headers and progress indicators.

**Package:** `apps/web`

Reference file: `clinical-data/initial-assessment.example.json` (field-by-field reference)

### Routes to add

Add these files under `apps/web/src/routes/_authenticated/`:

```
_authenticated/
└── children/
    └── $childId/
        └── assessment/
            ├── new.tsx              → /dashboard/children/:childId/assessment/new
            └── $assessmentId.tsx    → /dashboard/children/:childId/assessment/:assessmentId
```

### Section breakdown

Implement as a tabbed or stepper form (recommend Tabs from ui/ — already available):

**Section A — Patient & Referral Info:**
- Auto-populated from child profile (name, DOB, age, sex)
- Additional fields: assessment date, location, referring therapist, referral source, caregiver details, chief complaint (multi-line text)

**Section B — Medical & Developmental History:**
- Primary diagnoses: multi-select using `Command` combobox from taxonomy (`taxonomy.listDiagnoses`)
- Prenatal / birth / neonatal history: textarea fields
- Gestational age at birth (weeks): number input
- Past medical/surgical history, current medications, allergies: textarea fields
- Previous therapies + duration: repeatable field group (add/remove rows)

**Section C — Developmental Milestones:**
- 12 milestone rows from `milestone.list` seed
- Each row: milestone label, achieved age (months, nullable), delayed checkbox, notes textarea
- At least one row must have a milestoneId selected (Zod validation enforced client-side)

**Section D — Sensory Processing Profile:**
- 7 system rows from `taxonomy.listSensorySystems`
- Each row: system label, 1–5 slider (Hypo → Typical → Hyper with labelled ends), notes textarea
- Overall behavioural observations: full-width textarea

**Section E — Functional & Fine-Motor Concerns:**
- 16-item checkbox grid from `taxonomy.listFunctionalConcerns`
- Clinical observations: textarea

**Section F — Standardised Assessment Tools:**
- Multi-select checklist from `taxonomy.listAssessmentTools`
- Per-selected-tool: scores/findings text field (inline expansion on select)
- Overall scores/percentiles summary: textarea

**Section G — Goals & Intervention Plan:**
- Up to 4 short-term goal inputs (description + target attainment %)
- Up to 4 long-term goal inputs
- Recommended frequency (sessions/week), session duration (minutes), intervention setting (select from seed), review period (weeks)
- Home program recommendations: textarea
- Equipment recommendations: multi-select from `taxonomy.listEquipment`
- Referrals: textarea

**Section H — Signatures:**
- Therapist: typed name (auto-filled from user profile), credentials (auto-filled), timestamp (readonly), IP (captured from browser)
- Guardian: typed name input, "Consent obtained for assessment and treatment" checkbox
- Both required before form submission

### tRPC hooks used

- `api.assessment.create.useMutation()`
- `api.taxonomy.listDiagnoses.useQuery()`
- `api.taxonomy.listSensorySystems.useQuery()`
- `api.taxonomy.listFunctionalConcerns.useQuery()`
- `api.taxonomy.listAssessmentTools.useQuery()`
- `api.taxonomy.listEquipment.useQuery()`
- `api.milestone.list.useQuery()`

## Acceptance criteria

- [ ] All 8 sections are implemented and navigable via tabs
- [ ] Section C requires at least one milestone entry (validated before submission)
- [ ] Section D sliders show labelled endpoints (1=Hypo, 3=Typical, 5=Hyper)
- [ ] Section H requires both therapist name and guardian name + checkbox before submit
- [ ] Form submits successfully and redirects to `AssessmentDetailPage`
- [ ] `AssessmentDetailPage` shows all 8 sections in read-only mode
- [ ] `pnpm check-types` passes

## Blocked by

- BE-07 (Initial assessment API)
- FE-02 (Child profile page — assessment is accessed from child profile)
