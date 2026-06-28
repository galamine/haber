# BE-11: Session Generation API

## Context

When a treatment plan is activated (BE-10), `TherapySession` and `SessionGameAssignment` records must be generated for the full program duration. When a plan is modified, future pending sessions must be regenerated. This is a synchronous trigger — no nightly job.

`TreatmentPlan` (with `startDate`, `programLengthWeeks`) and `PlanGameAssignment` (with `frequencyPerWeek`) exist in `plans.prisma`. `TherapySession`, `SessionGameAssignment` exist in `sessions.prisma` (BE-01d). This issue creates the `SessionGenerator` service and the `session` tRPC router.

**BE-10 and BE-01d are both done — this can proceed.**

## Files to Create

```
packages/api/src/services/session-generator.ts
packages/api/src/schemas/session.ts
packages/api/src/routers/session.ts
```

## Files to Modify

```
packages/api/src/routers/index.ts          — register sessionRouter
packages/api/src/routers/plan.ts         — wire session-generator into activate and modify
```

---

## Implementation Details

### `packages/api/src/services/session-generator.ts`

`generateSessionsForPlan(planId)`:
1. Fetch plan with `gameAssignments` ordered by `order`
2. Compute `maxFrequency = max(frequencyPerWeek across assignments, 1)`
3. Loop `week` 0 → `programLengthWeeks - 1`, `dayOffset` 0 → 4 (Mon–Fri):
   - Compute `scheduledDate = plan.startDate + week*7 + dayOffset`
   - Stop when `week*5 + dayOffset >= maxFrequency * programLengthWeeks`
   - Push `{ planId, childId, assignedTherapistId: plan.createdById, scheduledDate, status: "PENDING", webhookSecret: uuid() }` to batch
4. `prisma.therapySession.createManyAndReturn({ data: batch })` → get created session IDs
5. `prisma.sessionGameAssignment.createMany({ data: assignments.flatMap(assignment => createdSessions.map(s => ({ sessionId: s.id, gameVersionId: assignment.gameVersionId, durationSeconds: assignment.durationSeconds, repetitions: assignment.repetitions, instructions: assignment.instructions, order: assignment.order }))) })`

`regenerateFutureSessions(oldPlanId, newPlanId, fromDate)`:
1. Delete all `PENDING` sessions for `oldPlanId` where `scheduledDate >= fromDate`
2. Call `generateSessionsForPlan(newPlanId)`

### `packages/api/src/schemas/session.ts`

```typescript
export const SessionStatusEnum = z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "ABSENT", "MANUALLY_CLOSED"]);

export const ListForPlanInput = z.object({
    planId: z.string(),
    status: SessionStatusEnum.optional(),
    fromDate: z.coerce.date().optional(),
    toDate: z.coerce.date().optional(),
});

export const GetCalendarInput = z.object({
    childId: z.string(),
    month: z.number().int().min(1).max(12),
    year: z.number().int(),
});
```

### `packages/api/src/routers/session.ts`

- `listForPlan` — `protectedProcedure`, filters by `planId`, optional `status`/`fromDate`/`toDate`
- `listForToday` — `protectedProcedure`, returns sessions where `assignedTherapistId = ctx.auth.userId` and `scheduledDate` is today
- `getCalendar` — `protectedProcedure`, groups sessions for a child/month/year by `YYYY-MM-DD` date string key

### Integration: `plan.activate`

In `plan.ts` `activate` mutation, after `prisma.treatmentPlan.update({ data: { status: "ACTIVE", isActive: true } })`, call `generateSessionsForPlan(input.planId)`.

### Integration: `plan.modify`

After creating new plan in `modify` mutation, call `regenerateFutureSessions(current.id, newPlan.id, new Date())`.

---

## tRPC Procedures

| Procedure | Input | Auth | Description |
|-----------|-------|------|-------------|
| `session.listForPlan` | `{ planId, status?, fromDate?, toDate? }` | protected | Sessions for a plan |
| `session.listForToday` | none | protected | Today's sessions for calling therapist |
| `session.getCalendar` | `{ childId, month, year }` | protected | Sessions grouped by date |

---

## Out of Scope

- Webhook endpoints — handled in BE-12
- Session execution mutations (markAbsent, manualClose, etc.) — handled in BE-12
- `session.get` (for polling) — handled in BE-12

---

## Verification

1. `pnpm check-types` — must pass across all packages
2. `pnpm check` (Biome) — tabs/double-quotes/import order on new and edited files
3. Activate a plan → `session.listForPlan` returns correct session count (4 weeks × N sessions/week = expected count)
4. `session.listForToday` returns only sessions where `assignedTherapistId = calling user` and `scheduledDate = today`
5. Modify a plan → old `PENDING` future sessions deleted, new sessions created, `IN_PROGRESS`/`COMPLETED` sessions untouched
6. Each generated session has unique `webhookSecret`
