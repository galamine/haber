# BE-14: Dashboards & Reporting API

## What to build

Implement aggregation procedures for the per-child dashboard, per-clinic dashboard, and super admin platform dashboard, plus the structured JSON export for progress reports.

**Packages:** `packages/api`, `packages/db`

### tRPC procedures

Add `packages/api/src/routers/dashboard.ts`:

```
// Per-child dashboard (assigned therapist)
dashboard.childSnapshot    (assigned therapist) → ChildSnapshot
  input: { childId }
  — Returns: name, age, opNumber, activePlan summary, nextSession date, attendance %
  — attendance % = completed sessions / (completed + absent) sessions for active plan

dashboard.milestoneRadar   (assigned therapist) → MilestoneRadarData
  input: { childId }
  — Returns milestone attainment history across all assessments for radar chart

dashboard.sensoryDeltaHistory (assigned therapist) → SensoryDeltaHistory
  input: { childId }
  — Returns per-system ratings across initial assessment + all follow-ups for line charts

dashboard.gameScoreTrends  (assigned therapist) → GameScoreTrend[]
  input: { childId, gameId? }
  — Returns per-game score history from GameResult records

dashboard.sessionCalendar  (assigned therapist) → SessionCalendarData
  input: { childId, month, year }
  — Returns sessions grouped by date with status indicators

dashboard.notesTimeline    (assigned therapist) → NotesTimelineEntry[]
  input: { childId }
  — Returns session notes + assessment notes in chronological order

// Clinic dashboard (CLINIC_ADMIN)
dashboard.clinicSummary    (CLINIC_ADMIN) → ClinicSummary
  — activeChildren, sessionsToday, sessionsThisWeek, roomUtilisation (booked/total today),
    therapistLoad (sessions per therapist today), planAdherenceRate, topCategoriesByActivity

// Super admin platform dashboard (SUPER_ADMIN)
dashboard.platformSummary  (SUPER_ADMIN) → PlatformSummary
  — Delegates to the aggregation already in clinic.platformSummary (BE-03)
  — Extended with: total children across all clinics, total sessions this month, new clinics this month
```

Add `packages/api/src/routers/report.ts`:

```
report.childProgress       (assigned therapist) → ChildProgressReport
  input: { childId }
  — Returns structured JSON: child summary, all assessments, all follow-ups, goal history,
    sensory deltas, game score trends, plan timeline — suitable for client-side print rendering
```

### Shared schemas

Add:
- `ChildSnapshotSchema`, `MilestoneRadarDataSchema`, `GameScoreTrendSchema`
- `ClinicSummarySchema`, `PlatformSummarySchema`, `ChildProgressReportSchema`

## Acceptance criteria

- [ ] `dashboard.childSnapshot` returns correct attendance % (completed / total non-pending sessions)
- [ ] `dashboard.sensoryDeltaHistory` returns a data point for the initial assessment and each follow-up
- [ ] `dashboard.gameScoreTrends` returns one data point per completed session with a game result
- [ ] `dashboard.clinicSummary.roomUtilisation` reflects booked rooms vs total active rooms today
- [ ] `dashboard.platformSummary` returns correct counts across multiple clinics (SuperAdmin only)
- [ ] `report.childProgress` returns all assessment, follow-up, goal, and session data in one call
- [ ] Therapist calling `dashboard.clinicSummary` receives `FORBIDDEN`
- [ ] `pnpm check-types` passes

## Blocked by

- BE-08 (follow-up assessments needed for sensory deltas and goal progress)
- BE-09 (goal history needed for progress report)
- BE-12 (game results needed for score trends)
