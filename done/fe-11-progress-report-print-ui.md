# FE-11 : Progress Report Print-Ready UI

## Context

Build a client-side print-ready progress report page at `/dashboard/children/:childId/report`. The API (`report.childProgress`) returns structured JSON; the client renders it as a print-formatted page with Haber branding.

Existing work to NOT duplicate:
- Route pattern from `apps/web/src/routes/_authenticated/children/$childId/dashboard.tsx`
- tRPC query pattern using `trpc.*.queryOptions({ childId })`
- shadcn `Table`, `Card`, `Button` components from `@haber-final/ui`
- Branding inline in `AppShell.tsx` (Stethoscope icon + "HaberApp" wordmark) — no separate `HaberLogo` exists

Key facts derived from the codebase:
- `trpc.report.childProgress.queryOptions({ childId })` returns: `child`, `assessments`, `followUps`, `goals`, `sessions`
- Note: The codebase uses `trpc.*.queryOptions()` pattern (TanStack Query options-based) — the issue references `useQuery()` but `queryOptions` is the correct API for this codebase
- The report has 8 sections: Cover, Summary, Assessment Summary, Goal Progress, Sensory Progress, Session Summary, Follow-Up Notes, Signatures
- Print CSS goes to `packages/ui/src/styles/globals.css` (per CLAUDE.md)
- No `@media print` currently exists in the codebase
- FE-09 (ChildDashboardPage) at `dashboard.tsx` is the entry point for the "Export Report" link
- The route path is `/children/$childId/report` (not `/dashboard/children/$childId/report`) — TanStack Router file-based routing strips the `_authenticated` prefix, matching the pattern used in `dashboard.tsx` and `index.tsx`

### Actual `report.childProgress` data shapes (verified from `packages/api/src/routers/report.ts`)

**`child`:** `{ id, fullName, opNumber, dob, sex }` — no `age`, `activePlan`, or `attendancePct` fields. Age must be computed from `dob` using: `Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))`.

**`child.latestPlanId`:** `string | null` — only an ID string. Active plan details (name, version, startDate, projectedEndDate) are **not included** in this API response. For now, omit active plan fields from the Summary section.

**`assessments[].sectionC` / `followUps[].sectionC / sectionD`:** Raw `unknown` Prisma JSON fields. All nested sub-fields (`therapistName`, `milestones`, `chiefComplaint`, `primaryDiagnoses`, `standardisedTools`, `therapistObservations`) are untyped — use `as any` casts when accessing them.

**`sensoryProfiles` shape:** `{ systemId: string, rating: number, notes: string | null, recordedAt: Date }` — field name is `rating` (not `baselineRating`), and `systemId` (not `systemName`). System name requires a separate lookup; display `systemId` if no lookup is available.

**`goals[].progressEntries[]` shape:** `{ id, attainmentPct, status, evidenceNotes: string | null, recordedAt: Date }` — evidence note is a plain string on each entry. Access via `goal.progressEntries?.[0]?.evidenceNotes`.

**`sessions[]` shape:** `{ id, scheduledDate: Date, status, notes, score: number | null }` — no `gameId` field. Games are accessible through `SessionGameAssignment → GameVersion → Game` joins, but these are **not included** in the `report.childProgress` query. Per-game session breakdown **cannot** be implemented without a new API query or modifying the existing one.

**Therapist credentials:** Not in the API response. Only `sectionC.therapistName` (name only) is available; credentials are not stored.

## Files to Create

| File | Purpose |
|---|---|
| `apps/web/src/routes/_authenticated/children/$childId/report.tsx` | Route page — query tRPC, compose sections |
| `apps/web/src/features/progress-report/ProgressReportPage.tsx` | Screen mode layout + "Open Print View" button |
| `apps/web/src/features/progress-report/ReportCover.tsx` | Cover section with Haber branding, child/clinic info |
| `apps/web/src/features/progress-report/ReportSummary.tsx` | Summary: active plan, dates, attendance, therapists |
| `apps/web/src/features/progress-report/AssessmentSummary.tsx` | Form 1: milestones, sensory profile, standardised tools |
| `apps/web/src/features/progress-report/GoalProgress.tsx` | Goal table with progress bars, evidence notes |
| `apps/web/src/features/progress-report/SensoryProgress.tsx` | Sensory delta table with colour-coded change column |
| `apps/web/src/features/progress-report/SessionSummary.tsx` | Session counts + per-game breakdown |
| `apps/web/src/features/progress-report/FollowUpNotes.tsx` | Chronological therapist observations |
| `apps/web/src/features/progress-report/Signatures.tsx` | Therapist signed-as block |

## Files to Modify

| File | Change |
|---|---|
| `packages/ui/src/styles/globals.css` | Add `@media print` styles — hide nav, force white bg, page breaks |
| `apps/web/src/routes/_authenticated/children/$childId/dashboard.tsx` | Add "Export Report" `<Link>` button after `<SnapshotCard />` |

## Step 1 — Add print CSS to `globals.css`

Insert at end of `globals.css`, before the final closing brace. Based on the Stitch mockup (`stitch_haber/progress_report_print_ready_ui/code.html`):

```css
/* Print Styles */
@media print {
  .no-print {
    display: none !important;
  }

  .print-full-width {
    margin: 0 !important;
    padding: 0 !important;
    max-width: 100% !important;
    box-shadow: none !important;
    background-color: white !important;
  }

  body {
    background-color: white !important;
  }

  @page {
    margin: 1.5cm;
  }

  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .print-page-break {
    page-break-before: always;
  }

  .print-avoid-break {
    page-break-inside: avoid;
  }
}
```

## Step 2 — Create `report.tsx` route page

Route pattern matching `dashboard.tsx`:

```tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { ProgressReportPage } from "@/features/progress-report/ProgressReportPage";
import { Skeleton } from "@haber-final/ui/components/skeleton";

export const Route = createFileRoute(
  "/_authenticated/children/$childId/report",
)({
  component: ReportRoute,
});

function ReportRoute() {
  const { childId } = Route.useParams();
  const { data, isLoading } = useQuery(
    trpc.report.childProgress.queryOptions({ childId }),
  );

  if (isLoading) return <Skeleton className="m-8 h-96 w-full" />;
  if (!data) return <div className="p-8">Report not found.</div>;

  return <ProgressReportPage report={data} childId={childId} />;
}
```

## Step 3 — Create `ProgressReportPage.tsx`

Main layout component with screen and print modes:

```tsx
import { Button } from "@haber-final/ui/components/button";
import { Printer } from "lucide-react";
import { ReportCover } from "./ReportCover";
import { ReportSummary } from "./ReportSummary";
import { AssessmentSummary } from "./AssessmentSummary";
import { GoalProgress } from "./GoalProgress";
import { SensoryProgress } from "./SensoryProgress";
import { SessionSummary } from "./SessionSummary";
import { FollowUpNotes } from "./FollowUpNotes";
import { Signatures } from "./Signatures";

type Props = {
  report: Awaited<ReturnType<typeof trpc.report.childProgress.queryOptions>> extends Promise<infer T> ? T : never;
  childId: string;
};

export function ProgressReportPage({ report, childId }: Props) {
  const handlePrint = () => window.print();

  return (
    <div className="p-8">
      <div className="no-print mb-6 flex justify-end">
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" />
          Open Print View
        </Button>
      </div>

      <div className="mx-auto max-w-3xl space-y-8">
        <ReportCover report={report} />
        <ReportSummary report={report} />
        <AssessmentSummary report={report} />
        <GoalProgress goals={report.goals} />
        <SensoryProgress assessments={report.assessments} followUps={report.followUps} />
        <SessionSummary sessions={report.sessions} />
        <FollowUpNotes followUps={report.followUps} />
        <Signatures />
      </div>
    </div>
  );
}
```

## Step 4 — Create `ReportCover.tsx`

Haber branding inline (matching `AppShell.tsx` pattern), child name/age/OP, report date, therapist, clinic name. Age is computed from `child.dob` (not a direct field). Therapist credentials are not available in the API.

```tsx
import { Stethoscope } from "lucide-react";

type Props = { report: any };

export function ReportCover({ report }: Props) {
  const { child, assessments } = report;
  const latestAssessment = assessments?.[assessments.length - 1];
  const sectionC = latestAssessment?.sectionC as any;
  const dob = new Date(child.dob);
  const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

  return (
    <div className="print-page-break">
      <div className="flex items-center gap-3 mb-8">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brown-600">
          <Stethoscope className="h-6 w-6 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="font-black text-brown-800 text-lg leading-tight">HaberApp</span>
          <span className="text-on-surface-variant text-xs tracking-wide">Clinical Excellence</span>
        </div>
      </div>

      <h1 className="text-center text-display-md font-medium mb-2">Progress Report</h1>
      <p className="text-center text-on-surface-variant mb-8">
        {child.fullName} · {age} yrs · OP#{child.opNumber}
      </p>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-on-surface-variant">Report Date</p>
          <p className="font-medium">{new Date().toLocaleDateString()}</p>
        </div>
        <div>
          <p className="text-on-surface-variant">Therapist</p>
          <p className="font-medium">{sectionC?.therapistName ?? "—"}</p>
        </div>
        <div>
          <p className="text-on-surface-variant">Clinic</p>
          <p className="font-medium">Haber Clinic</p>
        </div>
      </div>
    </div>
  );
}
```

## Step 5 — Create `ReportSummary.tsx`

Active plan info is not available from the current `report.childProgress` API. Only assigned therapists are shown (extracted from `sectionC.therapistName` on assessments and follow-ups). A separate `treatmentPlan` query would be needed for active plan details.

```tsx
type Props = { report: any };

export function ReportSummary({ report }: Props) {
  const { child, assessments, followUps } = report;
  const therapists = [...new Set([
    ...(assessments?.map((a: any) => (a.sectionC as any)?.therapistName) ?? []),
    ...(followUps?.map((f: any) => (f.sectionC as any)?.therapistName) ?? []),
  ])].filter(Boolean);

  return (
    <section>
      <h2 className="text-display-xs font-medium mb-4">Summary</h2>
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div className="col-span-2">
          <dt className="text-on-surface-variant">Assigned Therapists</dt>
          <dd className="font-medium">{therapists.join(", ") || "—"}</dd>
        </div>
      </dl>
      <p className="text-xs text-on-surface-variant mt-4">
        Note: Active plan and attendance data are not available from the current report API.
      </p>
    </section>
  );
}
```

## Step 6 — Create `AssessmentSummary.tsx`

Milestone table (12 rows with achieved age + delayed flag), sensory profile snapshot, chief complaint, primary diagnoses, standardised tools. Note: `sectionC` is a raw `unknown` JSON field — all sub-fields must be accessed via `as any` casts.

```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@haber-final/ui/components/table";

type Props = { report: any };

export function AssessmentSummary({ report }: Props) {
  const { assessments } = report;
  const latest = assessments?.[0];
  const sectionC = latest?.sectionC as any;
  const milestones = sectionC?.milestones ?? [];
  const sensoryProfiles = latest?.sensoryProfiles ?? [];
  const tools = sectionC?.standardisedTools ?? [];
  const chiefComplaint = sectionC?.chiefComplaint;
  const primaryDiagnoses = sectionC?.primaryDiagnoses ?? [];

  return (
    <section className="print-avoid-break">
      <h2 className="text-display-xs font-medium mb-4">Assessment Summary (Form 1)</h2>

      {chiefComplaint && (
        <div className="mb-4">
          <h3 className="text-sm font-medium mb-1">Chief Complaint</h3>
          <p className="text-sm text-on-surface-variant">{chiefComplaint}</p>
        </div>
      )}

      {primaryDiagnoses.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium mb-1">Primary Diagnoses</h3>
          <ul className="text-sm text-on-surface-variant list-disc list-inside">
            {primaryDiagnoses.map((d: any, i: number) => (
              <li key={i}>{d?.description ?? d}</li>
            ))}
          </ul>
        </div>
      )}

      <h3 className="text-sm font-medium mb-2">Milestones</h3>
      <Table className="mb-6">
        <TableHeader>
          <TableRow>
            <TableHead>Milestone</TableHead>
            <TableHead>Achieved Age</TableHead>
            <TableHead>Delayed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {milestones.slice(0, 12).map((m: any, i: number) => (
            <TableRow key={i}>
              <TableCell>{m?.description ?? `Milestone ${i + 1}`}</TableCell>
              <TableCell>{m?.achievedAge ?? "—"}</TableCell>
              <TableCell>{m?.isDelayed ? "Yes" : "No"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <h3 className="text-sm font-medium mb-2">Sensory Profile</h3>
      <Table className="mb-6">
        <TableHeader>
          <TableRow>
            <TableHead>System</TableHead>
            <TableHead>Rating</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sensoryProfiles.map((sp: any, i: number) => (
            <TableRow key={i}>
              <TableCell>{sp.systemId ?? `System ${i + 1}`}</TableCell>
              <TableCell>{sp.rating ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {tools.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2">Standardised Tools Administered</h3>
          <ul className="text-sm text-on-surface-variant list-disc list-inside">
            {tools.map((t: any, i: number) => (
              <li key={i}>
                {t?.name ?? `Tool ${i + 1}`}
                {t?.scoreSummary ? ` — ${t.scoreSummary}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
```

## Step 7 — Create `GoalProgress.tsx`

Goal table with description, horizon, target %, current %, status, progress bar, and latest evidence note. Note: evidence notes live on `goal.progressEntries[]` — each entry has `evidenceNotes: string | null`. Access via `goal.progressEntries?.[0]?.evidenceNotes`.

```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@haber-final/ui/components/table";
import { Progress } from "@haber-final/ui/components/progress";

type Props = { goals: any[] };

export function GoalProgress({ goals }: Props) {
  return (
    <section className="print-avoid-break">
      <h2 className="text-display-xs font-medium mb-4">Goal Progress</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Goal</TableHead>
            <TableHead>Horizon</TableHead>
            <TableHead>Target %</TableHead>
            <TableHead>Current %</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Evidence Note</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {goals.map((goal: any) => {
            const latestEntry = goal.progressEntries?.[0];
            return (
              <TableRow key={goal.id}>
                <TableCell className="max-w-[200px]">{goal.description}</TableCell>
                <TableCell>{goal.horizon}</TableCell>
                <TableCell>{goal.targetAttainmentPct}%</TableCell>
                <TableCell>{goal.currentAttainmentPct}%</TableCell>
                <TableCell className="w-[120px]">
                  <Progress value={goal.currentAttainmentPct} className="h-2" />
                </TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    goal.status === "ON_TRACK" ? "bg-success-100 text-success-700" :
                    goal.status === "BEHIND" ? "bg-warning-100 text-warning-700" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {goal.status?.replace("_", " ")}
                  </span>
                </TableCell>
                <TableCell className="max-w-[150px] text-xs text-on-surface-variant">
                  {latestEntry?.evidenceNotes ?? "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </section>
  );
}
```

## Step 8 — Create `SensoryProgress.tsx`

Sensory delta table with baseline, latest, change (▲▼), colour-coded (green=improvement, red=regression, grey=unchanged). Note: `sensoryProfiles` uses `systemId` and `rating` (not `systemName` / `baselineRating`). System name requires a separate lookup — display `systemId` if unavailable.

```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@haber-final/ui/components/table";

type Props = { assessments: any[]; followUps: any[] };

export function SensoryProgress({ assessments, followUps }: Props) {
  const baseline = assessments?.[0]?.sensoryProfiles ?? [];
  const latest = followUps?.[0]?.sensoryProfiles ?? baseline;

  const rows = latest.map((sys: any, i: number) => {
    const base = baseline[i];
    const baseVal = parseFloat(base?.rating ?? "0");
    const latestVal = parseFloat(sys?.rating ?? "0");
    const change = latestVal - baseVal;

    return { system: sys.systemId ?? `System ${i + 1}`, baseline: baseVal, latest: latestVal, change };
  });

  return (
    <section className="print-avoid-break">
      <h2 className="text-display-xs font-medium mb-4">Sensory Progress</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>System</TableHead>
            <TableHead>Baseline</TableHead>
            <TableHead>Latest</TableHead>
            <TableHead>Change</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>
              <TableCell>{row.system}</TableCell>
              <TableCell>{row.baseline}</TableCell>
              <TableCell>{row.latest}</TableCell>
              <TableCell>
                {row.change > 0 ? (
                  <span className="text-success-600">▲ {row.change.toFixed(1)}</span>
                ) : row.change < 0 ? (
                  <span className="text-danger-600">▼ {Math.abs(row.change).toFixed(1)}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
```

## Step 9 — Create `SessionSummary.tsx`

Total sessions, completed, absent, manually closed. Per-game breakdown is **not available** — `sessions[]` has no `gameId` field; games are accessed through `SessionGameAssignment → GameVersion → Game` joins which are not included in `report.childProgress`.

```tsx
type Props = { sessions: any[] };

export function SessionSummary({ sessions }: Props) {
  const total = sessions.length;
  const completed = sessions.filter((s: any) => s.status === "COMPLETED").length;
  const absent = sessions.filter((s: any) => s.status === "ABSENT").length;
  const manuallyClosed = sessions.filter((s: any) => s.status === "MANUALLY_CLOSED").length;

  return (
    <section className="print-avoid-break">
      <h2 className="text-display-xs font-medium mb-4">Session Summary</h2>
      <dl className="grid grid-cols-4 gap-4 text-sm">
        <div><dt className="text-on-surface-variant">Total</dt><dd className="font-medium">{total}</dd></div>
        <div><dt className="text-on-surface-variant">Completed</dt><dd className="font-medium">{completed}</dd></div>
        <div><dt className="text-on-surface-variant">Absent</dt><dd className="font-medium">{absent}</dd></div>
        <div><dt className="text-on-surface-variant">Manually Closed</dt><dd className="font-medium">{manuallyClosed}</dd></div>
      </dl>
      <p className="text-xs text-on-surface-variant mt-4">
        Note: Per-game breakdown is not available from the current report API.
      </p>
    </section>
  );
}
```

## Step 10 — Create `FollowUpNotes.tsx`

Chronological list of `sectionD.therapistObservations` from follow-ups (newest first). Note: `sectionD` is a raw `unknown` JSON field — use `as any` cast to access nested `therapistObservations`.

```tsx
import { Card, CardContent } from "@haber-final/ui/components/card";

type Props = { followUps: any[] };

export function FollowUpNotes({ followUps }: Props) {
  const notes = followUps
    .flatMap((f: any) => (f.sectionD as any)?.therapistObservations ?? [])
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <section className="print-avoid-break">
      <h2 className="text-display-xs font-medium mb-4">Follow-Up Notes</h2>
      <div className="space-y-4">
        {notes.map((note: any, i: number) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex justify-between text-xs text-on-surface-variant mb-2">
                <span>{note.date ? new Date(note.date).toLocaleDateString() : ""}</span>
              </div>
              <p className="text-sm">{note.observation ?? note.content ?? ""}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
```

## Step 11 — Create `Signatures.tsx`

Therapist signed-as block with name, credentials, timestamp:

```tsx
export function Signatures() {
  return (
    <section className="print-page-break mt-12">
      <h2 className="text-display-xs font-medium mb-4">Signatures</h2>
      <div className="border-t border-border pt-4">
        <div className="flex justify-between text-sm">
          <div>
            <p className="font-medium">Therapist</p>
            <p className="text-on-surface-variant">Name: ________________________</p>
            <p className="text-on-surface-variant">Credentials: _________________</p>
          </div>
          <div className="text-right">
            <p className="font-medium">Date</p>
            <p className="text-on-surface-variant">________________________</p>
          </div>
        </div>
      </div>
    </section>
  );
}
```

## Step 12 — Add "Export Report" button to `dashboard.tsx`

After `<SnapshotCard />` and before the `<div className="grid gap-6 lg:grid-cols-3">`:

```tsx
import { Printer } from "lucide-react";

<SnapshotCard ... />

<div className="flex justify-end mb-4">
  <Button variant="outline" asChild>
    <Link
      to="/children/$childId/report"
      params={{ childId }}
      className="gap-2"
    >
      <Printer className="h-4 w-4" />
      Export Report
    </Link>
  </Button>
</div>

<div className="grid gap-6 lg:grid-cols-3">
```

## Verification

- [ ] `ProgressReportPage` loads and renders all 8 sections from API JSON
- [ ] "Open Print View" button triggers `window.print()` showing only report content
- [ ] Sidebar and action buttons are hidden in print mode (via `.no-print`)
- [ ] Page breaks occur between major report sections (`.print-page-break`)
- [ ] Cover section shows Haber branding (inline Stethoscope icon + "HaberApp"), child info, and clinic name
- [ ] Goal table shows correct current attainment % and status badge
- [ ] Sensory change column is colour-coded (green=improvement ▲, red=regression ▼, grey=unchanged —)
- [ ] `pnpm check-types` passes
- [ ] `pnpm check` passes (Biome lint + format)

## Blocked by

- BE-14 — Reporting API (`report.childProgress` tRPC endpoint must exist first)
- FE-09 — ChildDashboardPage is the entry point; without it there is no "Export Report" link
