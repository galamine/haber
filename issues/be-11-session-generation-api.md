# BE-11: Session Generation API

## What to build

Implement `SessionGenerator`: generates `TherapySession` and `SessionGameAssignment` records for the full plan duration when a plan is activated, and regenerates affected future sessions when a plan is modified. No nightly job — triggered synchronously on plan activation/modification.

**Packages:** `packages/api`

### SessionGenerator service

Create `packages/api/src/services/session-generator.ts`:

```typescript
// Generates sessions for a plan from startDate through end of programLengthWeeks
// For each week, creates sessions according to frequencyPerWeek of the plan's game assignments
// Each session gets: planId, childId, scheduledDate, status=PENDING, webhookSecret=uuid()
// Each session gets SessionGameAssignment rows pre-linked from PlanGameAssignment
generateSessionsForPlan(planId: string): Promise<TherapySession[]>

// Deletes all PENDING sessions for a plan that are scheduled after `fromDate`
// Then calls generateSessionsForPlan with the new plan version
regenerateFutureSessions(oldPlanId: string, newPlanId: string, fromDate: Date): Promise<void>
```

### Integration points

- `plan.activate` calls `generateSessionsForPlan(planId)`
- `plan.modify` calls `regenerateFutureSessions(oldPlanId, newPlanId, today)`
- Sessions that are `IN_PROGRESS`, `COMPLETED`, `ABSENT`, or `MANUALLY_CLOSED` are never deleted during regeneration

### tRPC procedures

Add to `packages/api/src/router/session.ts`:

```
session.listForPlan     (assigned therapist) → TherapySession[]
  input: { planId, status?, fromDate?, toDate? }

session.listForToday    (assigned therapist) → TherapySession[]
  — Returns all sessions with scheduledDate = today for the calling therapist

session.getCalendar     (assigned therapist) → { [date: string]: TherapySession[] }
  input: { childId, month, year }
```

### Generation algorithm

Given a plan with `startDate`, `programLengthWeeks`, and game assignments with `frequencyPerWeek`:

1. Compute the schedule: for each week of the program, create N sessions (N = max `frequencyPerWeek` across all game assignments)
2. Distribute sessions across weekdays (skip weekends if clinic is not configured for them — default: Mon–Fri)
3. Each session receives pre-linked `SessionGameAssignment` rows from `PlanGameAssignment`

### Shared schemas

Add: `TherapySessionSchema`, `SessionGameAssignmentSchema`

## Acceptance criteria

- [ ] `plan.activate` triggers session generation; `session.listForPlan` returns the correct count
- [ ] For a 4-week plan with `frequencyPerWeek = 3`, 12 sessions are generated on weekdays
- [ ] Each generated session has `webhookSecret` set to a unique UUID
- [ ] `plan.modify` triggers regeneration; PENDING future sessions from old plan are deleted; new sessions created for the new plan
- [ ] `IN_PROGRESS` / `COMPLETED` sessions are NOT deleted during regeneration
- [ ] `session.listForToday` returns only today's sessions for the calling therapist
- [ ] `pnpm typecheck` passes

## Blocked by

- BE-10 (TreatmentPlan and PlanGameAssignment must exist and plan must be activatable)
- BE-01d (TherapySession and SessionGameAssignment models must exist)
