# 023 — Clinic & Platform Dashboards [AFK]

**Type:** AFK  
**PRD User Stories:** 54, 55

## What to build

Two operational dashboards: (1) the Clinic Admin dashboard for managing day-to-day clinic operations, and (2) the Super Admin platform dashboard for managing the HaberApp platform across all tenants. Both are read-only aggregation views backed by dedicated API endpoints.

## Acceptance criteria

**Schema / migrations**
- [ ] No new tables — read-optimised query endpoints only

**API endpoints**
- [ ] `GET /clinic/dashboard` — clinic_admin only: returns:
  - `activeStudents`: count of students with `deleted_at: null` and an active plan
  - `sessionsToday`: count of sessions with today's `scheduledDate`
  - `sessionsThisWeek`: count for the current ISO week
  - `roomUtilization`: `[{ roomId, roomName, sessionsThisWeek, totalCapacity: 5 }]` (capacity = 5 sessions/week per room by default)
  - `therapistLoad`: `[{ therapistId, therapistName, sessionCount (this week), completedCount }]`
  - `planAdherenceRate`: `completedSessions / scheduledSessions` over the last 30 days (%)
  - `topCategoriesByActivity`: `[{ categoryName, sessionCount }]` top 5 game categories by session count this week
  - `consentAlerts`: count of students with `consentStatus: 'withdrawn'`
- [ ] `GET /super-admin/dashboard` — super_admin only: returns:
  - `tenantsByTier`: `[{ tier, count }]`
  - `totalTenants`: int
  - `mauByRole`: `[{ role, count }]` — monthly active users (authenticated in last 30 days) per role
  - `gameRuntimeHealth`: `[{ gameId, gameName, successRate, avgLatencyMs, partialResultRate }]` (from `GameResult` table)
  - `planUsageVsCaps`: `[{ tenantId, clinicName, activeStudents, maxStudents, activePlans, utilizationPct }]`
  - `errorRatesByEndpoint`: `[{ endpoint, errorCount (last 24h), p95LatencyMs }]` (from access logs or a lightweight counter table)

**Frontend**
- [ ] Clinic Admin home page (default landing page for `clinic_admin` role):
  - Metric cards row: Active Students, Sessions Today, Sessions This Week, Plan Adherence %
  - Room utilization: horizontal bar chart per room (sessions booked / capacity)
  - Therapist load: sortable table with session count per therapist; highlight therapists at > 80% capacity
  - Top categories: horizontal bar chart of top 5 game categories by activity
  - Consent alerts: amber card if any students have withdrawn consent, with a "View Students" link
- [ ] Super Admin home page (default landing for `super_admin` role):
  - Metric cards: Total Tenants, MAU (total), Active Plans
  - Tenants by tier: donut chart (Basic / Advanced / Enterprise)
  - Game runtime health: table with success rate badge (green ≥ 95%, amber 80–95%, red < 80%) and avg latency
  - Plan usage vs. caps: table sorted by utilization % descending; highlight clinics > 90% of student cap
  - Error rates: table of top 10 endpoints by error count in the last 24 hours

**Tests**
- [ ] `GET /clinic/dashboard` returns `activeStudents` count that matches students with an active plan in the clinic
- [ ] `planAdherenceRate` is `completed / scheduled` over the last 30 days; a clinic with 8/10 completed returns `80`
- [ ] `GET /super-admin/dashboard` is not accessible by `clinic_admin` (returns 403)
- [ ] `GET /clinic/dashboard` is tenant-scoped: Clinic A admin cannot see Clinic B's metrics
- [ ] `topCategoriesByActivity` returns at most 5 categories
- [ ] `mauByRole` counts only users who authenticated in the last 30 days

## QA / Manual testing

- [ ] Log in as clinic_admin → verify you land on the Clinic Dashboard → check that "Sessions Today" matches the number of sessions scheduled in the database for today
- [ ] Set one therapist to have 5 sessions this week → verify their row in the "Therapist Load" table is highlighted
- [ ] Withdraw consent for a student → verify the "Consent Alerts" amber card appears with count 1 → click "View Students" → verify navigation to the filtered student list
- [ ] Log in as super_admin → verify the platform dashboard loads → check the tenants-by-tier donut chart shows the correct breakdown
- [ ] Find a game with a low success rate in the health table → verify the badge is red (< 80%)

## Blocked by

- Issue 002 — Tenant, Clinic & Subscription Setup
- Issue 015 — Session Generation & Queue
