# FE-10: Clinic & Super Admin Dashboard UI

## What to build

Build the ClinicAdmin operational dashboard and the SuperAdmin platform overview dashboard.

**Package:** `packages/client`

### Routes to add

```
/dashboard → ClinicDashboardPage (ClinicAdmin/Therapist default landing)
/dashboard/platform → PlatformDashboardPage (SuperAdmin only)
```

### ClinicDashboardPage

Accessible to all authenticated users; data scoped to their clinic.

**Summary row (Stat cards using `Card` from ui/):**
- Active children count
- Sessions today (count + breakdown: pending / in progress / completed)
- Sessions this week

**Room utilisation section:**
- Table: room name, code, status, booked today (yes/no), occupying therapist
- Simple bar showing booked/total ratio

**Therapist load section:**
- Table: therapist name, sessions assigned today, sessions completed today
- Colour-coded load indicator (green = ≤3, amber = 4-6, red = >6)

**Plan adherence rate:**
- % of sessions marked completed (not absent or manually closed) out of all non-pending sessions
- Recharts `RadialBarChart` or simple progress ring

**Top categories by activity:**
- Recharts `BarChart`: game category vs session count this month

**Therapist dashboard variant:**
- Same page for therapists shows a simplified version: only their own sessions today, their assigned children count, their plan adherence rate

### PlatformDashboardPage (SuperAdmin)

```
/dashboard/platform
```

**Summary row:**
- Total registered clinics
- Total active children across all clinics
- Total sessions this month
- New clinics this month

**Clinics table:**
- Name, creation date, active children, active therapists, sessions this month
- Sortable columns
- Pagination

### tRPC hooks used

- `api.dashboard.clinicSummary.useQuery()`
- `api.dashboard.platformSummary.useQuery()` (SuperAdmin)

## Acceptance criteria

- [ ] ClinicAdmin landing at `/dashboard` sees the clinic dashboard with correct session counts
- [ ] Therapist landing at `/dashboard` sees only their own sessions today
- [ ] Room utilisation table reflects actual room bookings for today
- [ ] SuperAdmin landing at `/dashboard/platform` sees the clinic table with correct aggregate counts
- [ ] Therapist navigating to `/dashboard/platform` is redirected (no access)
- [ ] All stat cards update on page reload
- [ ] Charts use the existing Tailwind chart colour variables
- [ ] `pnpm --filter client typecheck` passes

## Blocked by

- BE-14 (Dashboards & reporting API)
- FE-01 (Clinic admin navigation must include the dashboard route)
