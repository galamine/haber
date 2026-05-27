# FE-02: Child Intake, Guardian & Consent UI

## What to build

Build the child intake wizard (profile, medical history, guardian registration, consent capture) and the child list/search page. Intake completeness is displayed as a checklist before allowing assessment.

**Package:** `packages/client`

### Routes to add

```
/dashboard/children                    → ChildrenListPage
/dashboard/children/new                → NewChildPage (multi-step wizard)
/dashboard/children/:id                → ChildProfilePage (read + tabs)
/dashboard/children/:id/edit           → EditChildPage
/dashboard/children/:id/consent        → ConsentPage
```

### Key components

**ChildrenListPage:**
- Search input, filter by consent status and assigned therapist
- Table: name, age, OP number, consent badge, assigned therapists, active plan name
- "New Child" button → `/dashboard/children/new`

**NewChildPage (multi-step wizard using Tabs or stepper):**
- Step 1 — Profile: name, DOB, sex, OP number, photo upload, address, languages, school, preferred therapist
- Step 2 — Medical history: birth history fields, immunisations, allergies, current medications, prior diagnoses, family history, sensory sensitivities (free-text fields)
- Step 3 — Guardians: add one or more guardians (name, relation, phone, email); each creates a User with `loginEnabled=false`
- Step 4 — Consent: for each guardian, display consent form with typed name, checkboxes for each consent type (TREATMENT, DATA_PROCESSING, IMAGE_VIDEO_CAPTURE), submit captures timestamp + IP

**ChildProfilePage:**
- Header: photo, name, age, OP number, consent status badge
- Tabs: Overview | Medical History | Guardians | Consent Records | Assessments | Plans | Sessions
- Overview tab: intake completeness checklist (calls `child.checkIntakeComplete`); shows missing fields; "Start Assessment" button (disabled if incomplete)

**ConsentPage:**
- Guardian-by-guardian consent form
- Shows per-guardian consent status for all three types
- "Withdraw consent" option for ClinicAdmin

### tRPC hooks used

- `api.child.create.useMutation()`
- `api.child.list.useQuery()`
- `api.child.get.useQuery()`
- `api.child.update.useMutation()`
- `api.child.checkIntakeComplete.useQuery()`
- `api.consent.record.useMutation()`
- `api.consent.getStatus.useQuery()`
- `api.consent.withdraw.useMutation()`

## Acceptance criteria

- [ ] New child wizard completes all 4 steps; child appears in list after submission
- [ ] Adding 2 guardians creates 2 guardian records visible in the Guardians tab
- [ ] Consent capture for all guardians (TREATMENT type) shows `consentStatus = GRANTED` badge
- [ ] "Start Assessment" button is disabled until `checkIntakeComplete` returns `true`
- [ ] ClinicAdmin can withdraw consent; badge updates to `WITHDRAWN`
- [ ] Soft-deleted children do not appear in the list for non-admin users
- [ ] All wizard steps validate with react-hook-form + Zod before allowing progress
- [ ] `pnpm --filter client typecheck` passes

## Blocked by

- BE-05 (Child intake API)
- BE-06 (Consent management API)
- FE-00 (App shell)
