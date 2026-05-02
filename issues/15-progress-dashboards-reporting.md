# 15-progress-dashboards-reporting

## What to build

Per-student longitudinal dashboard with milestone radar chart, per-game score trends, session calendar, notes timeline, plan timeline with version markers. Per-clinic operational dashboard. Platform-wide dashboard for Super Admin. Printable progress report (structured JSON from API, client-side rendering).

## Acceptance criteria

- [ ] `GET /v1/students/:id/dashboard` — returns: snapshot card (name, age, OP, active plan, next session, attendance %), milestone radar data over time, per-game score trends, session calendar (last 30 days), notes timeline, plan timeline with version markers
- [ ] `GET /v1/clinics/:id/dashboard` — returns: active students count, sessions today/this week, room utilization %, therapist load, plan adherence rate (sessions completed / sessions scheduled), top categories by activity
- [ ] `GET /v1/platform/dashboard` — Super Admin: tenants by tier, MAU per role, game runtime health, plan usage vs caps, error rates
- [ ] `GET /v1/students/:id/report` — returns structured JSON for progress report (print-ready)
- [ ] Frontend: Student dashboard page with radar chart (milestones over time), line charts (per-game scores), session calendar heatmap, notes timeline, plan version timeline
- [ ] Frontend: Clinic dashboard with KPI cards, utilization charts, therapist load distribution
- [ ] Frontend: Progress report page with client-side print rendering
- [ ] Per-tenant branding (logo on reports) behind feature flag `per_tenant_branding`
- [ ] Prisma: DashboardService aggregates data from Session, GameResult, Assessment, TreatmentPlan tables
- [ ] Integration tests: dashboard data matches source records, report JSON is complete for client rendering

## Blocked by

- [12-game-result-ingestion.md](./12-game-result-ingestion.md)

## User stories

- #53: Doctor or Therapist sees per-student dashboard: snapshot card, milestone radar chart over time, per-game line charts, session calendar, notes timeline, plan timeline with version markers
- #54: Clinic Admin sees clinic dashboard: active students, sessions today/this week, room utilization, therapist load, plan adherence rate, top categories by activity
- #55: Super Admin sees platform dashboard: tenants by tier, MAU per role, game runtime health, plan usage vs caps, error rates
- #56: Doctor exports student progress report as print-ready view (structured JSON from API, client-side rendering)
- #57: Clinic Admin sees per-tenant branding (logo on reports) behind feature flag

## QA checklist

- [ ] Radar chart shows milestones on Y-axis, time on X-axis with multiple assessments overlaid
- [ ] Line chart shows per-game score trends with rubric version annotation
- [ ] Session calendar shows attendance (green=attended, red=absent, gray=scheduled)
- [ ] Notes timeline is scrollable and shows actor + timestamp
- [ ] Plan timeline shows version markers with modification dates and doctor name
- [ ] Report JSON contains all required fields for print rendering
- [ ] Clinic dashboard KPIs update daily
- [ ] Platform dashboard shows aggregate data across all tenants
- [ ] Branding flag shows/hides logo on reports correctly