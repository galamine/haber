# FE-11: Progress Report Print-Ready UI

## What to build

Build the client-side print-ready progress report. The API returns structured JSON; the client renders it as a print-formatted page with Haber branding.

**Package:** `packages/client`

### Routes to add

```
/dashboard/children/:id/report → ProgressReportPage
```

Link from `ChildDashboardPage` (FE-09) via "Export Report" button.

### ProgressReportPage

The page has two modes:
1. **Screen mode:** styled with the Haber design system, shows a preview with an "Open Print View" button
2. **Print mode:** triggered by `window.print()` — uses `@media print` CSS to show only the report content, hide navigation and action buttons

### Report sections (structured JSON from `report.childProgress`)

**Cover:**
- Haber logo (HaberLogo component)
- Child name, age, OP number
- Report date, generating therapist name + credentials
- Clinic name

**Summary:**
- Active plan name + version
- Program start date, projected end date
- Attendance % for the plan period
- Assigned therapists list

**Assessment Summary (Form 1):**
- Chief complaint
- Primary diagnoses
- Milestone table: 12 milestones, achieved age, delayed flag
- Sensory profile snapshot (7 systems with baseline ratings)
- Standardised tools administered (list with score summaries)

**Goal Progress:**
- Table: goal description, horizon, target %, current %, status
- Progress bar column
- Evidence note (latest entry)

**Sensory Progress:**
- Table: system, baseline rating, latest follow-up rating, change (▲▼)
- Colour-coded change column

**Session Summary:**
- Total sessions, completed, absent, manually closed
- Per-game: game name, sessions played, average score, score range

**Follow-Up Notes:**
- Chronological list of follow-up clinical observations (sectionD.therapistObservations)

**Signatures:**
- Therapist signed-as block (name, credentials, timestamp)

### Print CSS

Add `@media print` styles to `packages/client/src/styles/globals.css`:
- Hide sidebar, nav, action buttons
- Force white background, black text
- Page breaks between report sections
- Haber logo at top of first page

### tRPC hooks used

- `api.report.childProgress.useQuery({ childId })`

## Acceptance criteria

- [ ] ProgressReportPage loads and renders all sections from the API JSON
- [ ] "Open Print View" button triggers `window.print()` showing only report content
- [ ] Sidebar and action buttons are hidden in print mode
- [ ] Page breaks occur between major report sections in print
- [ ] Cover section shows Haber logo, child info, and clinic name
- [ ] Goal table shows correct current attainment % and status
- [ ] Sensory change column is colour-coded (green=improvement, red=regression, grey=unchanged)
- [ ] `pnpm --filter client typecheck` passes

## Blocked by

- BE-14 (Reporting API — `report.childProgress`)
- FE-09 (Per-child dashboard is the entry point to the report)
