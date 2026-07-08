# FE-10 : Clinic & Super Admin Dashboard UI

## Context

Build two dashboard pages in `apps/web`:
1. **ClinicDashboardPage** (`/dashboard`) — operational overview for ClinicAdmin and Therapist roles
2. **PlatformDashboardPage** (`/dashboard/platform`) — platform-wide metrics for SuperAdmin only

### Existing work to NOT duplicate
- Backend `dashboard.clinicSummary` and `dashboard.platformSummary` tRPC procedures already exist in `packages/api/src/routers/dashboard.ts`
- Auth guard pattern (`useAuthStore.getState().role` in `beforeLoad`) already used across all routes
- Recharts (`^2.15.2`), Card, Table, Badge, Progress, Skeleton, ChartContainer all available in `packages/ui`
- Chart CSS variables (`--chart-1` through `--chart-7`) defined in `packages/ui/src/styles/globals.css`
- `CHART_COLORS` array pattern established in `apps/web/src/features/child-dashboard/SensoryTrendChart.tsx`
- Existing `platform/clinics/index.tsx` uses `trpc.clinic.platformSummary` — the new `platform.tsx` adds summary cards above

### Gaps to fill
- `clinicSummary` backend returns `sessionsToday` as a single number (no status breakdown), `therapistLoad` without completed counts, and `roomUtilisation` without room-level detail
- `dashboard.tsx` is a stub ("Welcome back. More content coming soon.")
- No `platform.tsx` route exists
- No reusable dashboard components (stat cards, tables, charts) exist

## Decisions

| Question | Decision |
|---|---|
| Therapist variant approach? | Conditional branch inside `DashboardPage` — same route, role-gated content. No separate file needed. |
| Platform route path? | `/dashboard/platform` (not `/platform/clinics`). SuperAdmin sees summary cards + clinics table. Keep existing `/platform/clinics` as a standalone page. |
| Table pagination? | Client-side. `platformSummary` returns all clinics (typically < 100). No server-side pagination needed. |
| Chart library? | Direct Recharts imports (matching `SensoryTrendChart.tsx` pattern), not the `ChartContainer` wrapper. |

## Files to Create

| File | Purpose |
|---|---|
| `apps/web/src/features/dashboard/StatCard.tsx` | Reusable stat card with icon, value, subtitle |
| `apps/web/src/features/dashboard/RoomUtilisationTable.tsx` | Room-level table + Progress bar |
| `apps/web/src/features/dashboard/TherapistLoadTable.tsx` | Therapist table with colour-coded load |
| `apps/web/src/features/dashboard/PlanAdherenceRing.tsx` | Recharts RadialBarChart for adherence % |
| `apps/web/src/features/dashboard/TopCategoriesChart.tsx` | Recharts BarChart for category activity |
| `apps/web/src/features/dashboard/PlatformClinicsTable.tsx` | Sortable + paginated clinics table |
| `apps/web/src/routes/_authenticated/dashboard/platform.tsx` | PlatformDashboardPage route (SuperAdmin) — maps to `/dashboard/platform` |

## Files to Modify

| File | Change |
|---|---|
| `packages/api/src/schemas/dashboard.ts` | Update `ClinicSummarySchema` — add session status breakdown, room-level detail, therapist completed counts |
| `packages/api/src/routers/dashboard.ts` | Enhance `clinicSummary` procedure to return enriched data |
| `apps/web/src/routes/_authenticated/dashboard.tsx` | Rewrite stub → full ClinicDashboardPage with all sections |

## Step 1 — Enhance Backend Schema

**File:** `packages/api/src/schemas/dashboard.ts`

Update `ClinicSummarySchema` to match the enriched response shape:

```typescript
export const ClinicSummarySchema = z.object({
  activeChildren: z.number(),
  sessionsToday: z.object({
    total: z.number(),
    pending: z.number(),
    inProgress: z.number(),
    completed: z.number(),
  }),
  sessionsThisWeek: z.number(),
  roomUtilisation: z.object({
    booked: z.number(),
    total: z.number(),
    rooms: z.array(z.object({
      id: z.string(),
      name: z.string(),
      code: z.string(),
      status: z.enum(["ACTIVE", "MAINTENANCE"]),
      bookedToday: z.boolean(),
      occupyingTherapist: z.string().nullable(),
    })),
  }),
  therapistLoad: z.array(z.object({
    therapistId: z.string(),
    name: z.string(),
    assignedToday: z.number(),
    completedToday: z.number(),
  })),
  planAdherenceRate: z.number(),
  topCategoriesByActivity: z.array(z.object({
    categoryId: z.string(),
    name: z.string(),
    sessionCount: z.number(),
  })),
});
```

## Step 2 — Enhance Backend `clinicSummary` Procedure

**File:** `packages/api/src/routers/dashboard.ts`

Replace the existing `clinicSummary` query body. Key changes:

1. **Session status breakdown for today** — add a `groupBy(["status"])` on today's sessions:
```typescript
const todaySessionsByStatus = await prisma.therapySession.groupBy({
  by: ["status"],
  where: { plan: { clinicId }, scheduledDate: { gte: today, lt: tomorrow } },
  _count: true,
});
const sessionsToday = {
  total: todaySessionsByStatus.reduce((s, g) => s + g._count, 0),
  pending: todaySessionsByStatus.find(g => g.status === "PENDING")?._count ?? 0,
  inProgress: todaySessionsByStatus.find(g => g.status === "IN_PROGRESS")?._count ?? 0,
  completed: todaySessionsByStatus.find(g => g.status === "COMPLETED")?._count ?? 0,
};
```

2. **Room-level detail** — query SensoryRoom + RoomBooking for today, resolve therapist names:
```typescript
const allRooms = await prisma.sensoryRoom.findMany({
  where: { clinicId, deletedAt: null },
  select: { id: true, name: true, code: true, status: true },
});
const todayBookings = await prisma.roomBooking.findMany({
  where: { roomId: { in: allRooms.map(r => r.id) }, scheduledDate: { gte: today, lt: tomorrow } },
  select: { roomId: true, claimedById: true },
});
```

3. **Therapist completedToday** — split the existing `therapistSessions` query into two groupBys (one for assigned, one filtering `status: "COMPLETED"`), or use a single groupBy with a having-then-filter approach. Return `assignedToday` + `completedToday` per therapist.

4. **Therapist display name** — resolve from `UserProfile.name` (not email). Join the profile relation:
```typescript
const therapists = await prisma.user.findMany({
  where: { id: { in: therapistIds } },
  select: { id: true, email: true, profile: { select: { name: true } } },
});
// Map: name: t.profile?.name ?? t.email
```

## Step 3 — Create `StatCard` Component

**File:** `apps/web/src/features/dashboard/StatCard.tsx`

```typescript
import { Card, CardContent, CardHeader, CardTitle } from "@haber-final/ui/components/card";
import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  children?: React.ReactNode;  // for badges/breakdown below value
};

export function StatCard({ title, value, subtitle, icon: Icon, children }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="font-medium text-sm text-on-surface-variant">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-on-surface-variant" />}
      </CardHeader>
      <CardContent>
        <div className="font-semibold text-2xl text-on-surface">{value}</div>
        {subtitle && <p className="text-on-surface-variant text-xs">{subtitle}</p>}
        {children}
      </CardContent>
    </Card>
  );
}
```

## Step 4 — Create `RoomUtilisationTable` Component

**File:** `apps/web/src/features/dashboard/RoomUtilisationTable.tsx`

Uses `Table` from `@haber-final/ui/components/table`, `Badge` for status, `Progress` for ratio bar. Follow the grid pattern from `platform/clinics/index.tsx`.

Key: Render table with columns [Name, Code, Status, Booked Today, Therapist]. Below: `<Progress value={bookedRatio} />` showing `{booked}/{total} rooms booked`.

## Step 5 — Create `TherapistLoadTable` Component

**File:** `apps/web/src/features/dashboard/TherapistLoadTable.tsx`

Uses `Table`, `Badge`. Colour logic for load indicator:
```typescript
function loadVariant(count: number) {
  if (count <= 3) return "success" as const;
  if (count <= 6) return "warning" as const;
  return "destructive" as const;
}
```

Columns: Therapist Name, Assigned Today, Completed Today, Load (Badge with colour).

## Step 6 — Create `PlanAdherenceRing` Component

**File:** `apps/web/src/features/dashboard/PlanAdherenceRing.tsx`

Uses Recharts `RadialBarChart` + `RadialBar`. Follow existing chart patterns:
- `CHART_COLORS` array from `SensoryTrendChart.tsx`
- Tooltip styling with CSS variables
- Empty state card when no data

```typescript
import { RadialBarChart, RadialBar, Tooltip, ResponsiveContainer } from "recharts";

const chartData = [{ name: "Adherence", value: rate, fill: "var(--chart-1)" }];

<ResponsiveContainer width="100%" height={200}>
  <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={chartData}>
    <RadialBar dataKey="value" cornerRadius={10} background={{ fill: "var(--chart-1)" }} />
    <Tooltip />
  </RadialBarChart>
</ResponsiveContainer>
```

## Step 7 — Create `TopCategoriesChart` Component

**File:** `apps/web/src/features/dashboard/TopCategoriesChart.tsx`

Uses Recharts `BarChart` + `Bar` + `XAxis` + `YAxis` + `Tooltip`. Same pattern as `SensoryTrendChart.tsx`:
- `CHART_COLORS` array
- Tooltip with CSS variable styling
- Empty state fallback

## Step 8 — Create `PlatformClinicsTable` Component

**File:** `apps/web/src/features/dashboard/PlatformClinicsTable.tsx`

**Note:** `platform/clinics/index.tsx` already renders a standalone clinics list at `/platform/clinics`. This component is for the **dashboard overview** at `/dashboard/platform` — it sits below summary stat cards and provides a compact, sortable/paginated view. Different route, different layout context.

Client-side sortable + paginated table using `Table`. State: `sortKey`, `sortDir`, `page`. PAGE_SIZE = 10.

Columns: Name, Created, Children, Therapists, Sessions. Sort toggles on column header click. Pagination controls at bottom.

## Step 9 — Rewrite `dashboard.tsx` (ClinicDashboardPage)

**File:** `apps/web/src/routes/_authenticated/dashboard.tsx`

- Keep existing `beforeLoad` (SUPER_ADMIN → redirect to `/platform/clinics`)
- **Remove the stub's profile check code.** The current file has a `useEffect` that redirects to `/user-profile` when `profile === null`, plus `useRouter` and a `useQuery(trpc.profile.get.queryOptions())` call — all of this must be deleted. Without removal, the dashboard would immediately redirect users away before rendering.
- Remove unused imports: `useRouter`, `useEffect`, `useQuery` (for profile)
- Add role-based conditional rendering:
  - **ClinicAdmin view:** All sections (stat cards, room table, therapist table, adherence ring, categories chart)
  - **Therapist view:** Simplified — only their own sessions today, their assigned children count, their adherence rate
- Fetch data with `useQuery(trpc.dashboard.clinicSummary.queryOptions())`
- Show `<Skeleton>` placeholders while loading
- Use the new dashboard components from `features/dashboard/`

Layout pattern (matching existing page styles):
```tsx
<div className="p-8 space-y-6">
  <h1 className="font-semibold text-2xl text-on-surface">Dashboard</h1>
  {/* Summary row */}
  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
    <StatCard title="Active Children" value={data.activeChildren} icon={Users} />
    <StatCard title="Sessions Today" value={data.sessionsToday.total} icon={Calendar}>
      <div className="flex gap-2 mt-2">
        <Badge variant="outline">{data.sessionsToday.pending} pending</Badge>
        <Badge variant="outline">{data.sessionsToday.inProgress} in progress</Badge>
        <Badge variant="outline">{data.sessionsToday.completed} completed</Badge>
      </div>
    </StatCard>
    <StatCard title="Sessions This Week" value={data.sessionsThisWeek} icon={TrendingUp} />
  </div>
  {/* Room utilisation, therapist load, adherence, categories */}
</div>
```

## Step 10 — Create `platform.tsx` (PlatformDashboardPage)

**File:** `apps/web/src/routes/_authenticated/dashboard/platform.tsx`

```typescript
export const Route = createFileRoute("/_authenticated/dashboard/platform")({
  beforeLoad: () => {
    if (useAuthStore.getState().role !== "SUPER_ADMIN") {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: PlatformDashboardPage,
});
```

Fetches `trpc.dashboard.platformSummary.queryOptions()`. Layout:
- Summary row: 4 StatCards (Total Clinics, Active Children, Sessions This Month, New Clinics)
- `<PlatformClinicsTable data={data.clinicData} />`

## Verification

- [ ] ClinicAdmin at `/dashboard` sees clinic summary with correct session counts and breakdown
- [ ] Therapist at `/dashboard` sees only their own sessions and assigned children
- [ ] Room utilisation table shows all rooms with booked status for today
- [ ] SuperAdmin at `/dashboard/platform` sees summary cards + clinics table with correct aggregates
- [ ] Therapist navigating to `/dashboard/platform` is redirected to `/dashboard`
- [ ] All stat cards display data and update on page reload
- [ ] Charts use `--chart-*` CSS variables and render correctly
- [ ] `pnpm check-types` passes with no errors

## Blocked by

- BE-14 (Dashboards & reporting API) — backend procedures exist but `clinicSummary` needs enrichment (Steps 1-2)
- FE-01 (Clinic admin navigation must include the dashboard route) — navigation sidebar must link to `/dashboard`
