# BE-16: Simplify Treatment Plan / Session / Game Domain

## Context

BE-10 (treatment plan API), BE-11 (session generation), BE-12 (session execution/webhooks), and BE-01c/BE-01d (schema) built a **generation-first** model: a therapist assembles a pool of games on a `TreatmentPlan` (`PlanGameAssignment`, with an unused `appliesToPhase` tag and a decorative `phases` JSON field), activates the plan, and `generateSessionsForPlan` bulk-creates `TherapySession` rows across hardcoded Mon–Fri slots, round-robining the plan's games onto them. Room booking happens later, as a separate step (`session.assignRoom`), checking only exact-timestamp equality against a shadow `RoomBooking` table.

This issue **removes generation entirely**. The therapist now creates each `TherapySession` as a discrete, manual act — picking date, time, duration, sensory room, and a single game, directly under a treatment plan — with the system warning (not silently allowing) if the chosen room or therapist has an overlapping booking. `phases` and the plan-level game pool (`PlanGameAssignment`) are deleted outright; games are chosen straight from the `Game`/`GameVersion` catalog per session. `Game`, `GameVersion`, `GameResult`, `SessionGameAssignment`'s shape, and the webhook start/complete endpoints in `apps/server/src/index.ts` are **out of scope** — they keep their exact current behavior.

**Decisions locked in with the product owner:**
- One game per session (matches the existing de-facto `@@unique([sessionId])` constraint on `SessionGameAssignment` — see `one-game-per-session.html`).
- `PlanGameAssignment` is removed entirely — no plan-level game pool.
- Conflict detection covers both room and therapist double-booking, via true start/duration time-range overlap (not exact-timestamp equality).
- No real production data exists — a clean, destructive Prisma migration is acceptable. No backfill script.

**This supersedes:** BE-11 in full (delete), the game-assignment procedures and `phases`/`checkSessionDuration` parts of BE-10, and the `assignRoom`/`RoomBooking` parts of BE-12. Everything else in BE-10/BE-12 (goal lifecycle, plan status transitions, webhook endpoints, other session-execution procedures) is untouched.

---

## Files to Delete

```
packages/api/src/services/session-generator.ts
```

## Files to Create

```
packages/api/src/lib/session-conflicts.ts
```

## Files to Modify

```
packages/db/prisma/schema/plans.prisma       — drop phases, PlanGameAssignment model + relations
packages/db/prisma/schema/sessions.prisma    — drop RoomBooking, add TherapySession.durationMinutes + indexes
packages/api/src/schemas/plan.ts             — drop phases/AddGameInput/UpdateGameInput/ReorderGamesInput
packages/api/src/schemas/session.ts          — add CheckConflictsInput, CreateSessionInput
packages/api/src/schemas/session-execution.ts — extend AssignRoomInput with acknowledgeConflict
packages/api/src/routers/plan.ts             — drop generation calls + game-assignment procedures
packages/api/src/routers/session.ts          — add checkConflicts + create, rewrite assignRoom
packages/api/src/routers/dashboard.ts        — rewrite room-occupancy query off RoomBooking
packages/api/src/routers/child.ts            — drop roomBooking/planGameAssignment cascade deletes
```

---

## Step 1 — Schema (`packages/db/prisma/schema/`)

### `plans.prisma`

Delete from `TreatmentPlan`:
```prisma
phases                 Json       @default("[]")   // DELETE
gameAssignments PlanGameAssignment[]                 // DELETE
```

Delete the whole model:
```prisma
model PlanGameAssignment { ... }   // DELETE ENTIRE MODEL
```

In `GameVersion`, delete:
```prisma
planAssignments PlanGameAssignment[]   // DELETE (keep sessionAssignments)
```

Resulting `TreatmentPlan` (unchanged fields kept as informational metadata — no longer drive generation):
```prisma
model TreatmentPlan {
  id                     String     @id @default(cuid())
  childId                String
  clinicId               String
  createdById            String
  name                   String
  programLengthWeeks     Int
  startDate              DateTime?
  projectedEndDate       DateTime?
  targetMilestones       String[]
  status                 PlanStatus @default(DRAFT)
  isActive               Boolean    @default(false)
  versionNumber          Int        @default(1)
  parentPlanId           String?
  sourcePresetId         String?
  sessionDurationMinutes Int        @default(60)
  closureReason          String?
  outcomeSummary         String?
  createdAt              DateTime   @default(now())
  updatedAt              DateTime   @updatedAt

  goals    Goal[]
  sessions TherapySession[]

  @@map("treatment_plan")
}
```

### `sessions.prisma`

Add to `TherapySession`:
```prisma
durationMinutes Int @default(60)
```
Add indexes:
```prisma
@@index([roomId, scheduledDate])
@@index([assignedTherapistId, scheduledDate])
```

Delete the whole model:
```prisma
model RoomBooking { ... }   // DELETE ENTIRE MODEL
```

`SessionGameAssignment` and `GameResult`: **no changes.**

### Migration

```bash
pnpm db:migrate -- --name simplify_plan_session_domain
```

Expect: `DROP TABLE plan_game_assignment`, `DROP TABLE room_booking`, `ALTER TABLE treatment_plan DROP COLUMN phases`, `ALTER TABLE therapy_session ADD COLUMN duration_minutes INTEGER NOT NULL DEFAULT 60`, plus the two new indexes. Destructive — acceptable, no production data to preserve.

```bash
pnpm db:generate
```

---

## Step 2 — Schemas

### `packages/api/src/schemas/plan.ts`

Remove `phases` from `CreatePlanInput` and `ModifyPlanInput.changes`. Remove `AddGameInput`, `UpdateGameInput`, `ReorderGamesInput` entirely. `PlanPresetSchema` is unchanged — `session_structure` stays as clinical reference JSON, it's just no longer mapped into `phases` by `plan.create`.

### `packages/api/src/schemas/session.ts`

Add:
```typescript
export const CheckConflictsInput = z.object({
  scheduledDate: z.coerce.date(),
  durationMinutes: z.number().int().positive(),
  roomId: z.string().optional(),
  assignedTherapistId: z.string().optional(),
  excludeSessionId: z.string().optional(), // for editing/rescheduling an existing session
});

export const CreateSessionInput = z.object({
  planId: z.string(),
  scheduledDate: z.coerce.date(),
  durationMinutes: z.number().int().positive(),
  roomId: z.string(),
  assignedTherapistId: z.string().optional(),
  gameVersionId: z.string(),
  durationSeconds: z.number().int().positive().optional(),
  repetitions: z.number().int().positive().optional(),
  instructions: z.string().optional(),
  acknowledgeConflict: z.boolean().default(false),
});
```

### `packages/api/src/schemas/session-execution.ts`

Extend:
```typescript
export const AssignRoomInput = z.object({
  sessionId: z.string(),
  roomId: z.string(),
  acknowledgeConflict: z.boolean().default(false),
});
```

---

## Step 3 — Conflict detection helper (`packages/api/src/lib/session-conflicts.ts`, new file)

```typescript
import { prisma } from "@haber-final/db";

type ConflictInput = {
  scheduledDate: Date;
  durationMinutes: number;
  roomId?: string;
  assignedTherapistId?: string;
  excludeSessionId?: string;
};

function overlaps(
  candidate: { scheduledDate: Date; durationMinutes: number },
  newStart: Date,
  newEnd: Date,
) {
  const candidateEnd = new Date(
    candidate.scheduledDate.getTime() + candidate.durationMinutes * 60_000,
  );
  return candidate.scheduledDate < newEnd && newStart < candidateEnd;
}

export async function findConflicts({
  scheduledDate,
  durationMinutes,
  roomId,
  assignedTherapistId,
  excludeSessionId,
}: ConflictInput) {
  const newStart = scheduledDate;
  const newEnd = new Date(scheduledDate.getTime() + durationMinutes * 60_000);

  // Cheap prefilter on the indexed scheduledDate column; exact overlap is
  // filtered in app code below since durationMinutes varies per row and
  // can't be expressed as a computed end-time in a Prisma `where` clause
  // without raw SQL — row counts per room/therapist per day are small.
  const [roomCandidates, therapistCandidates] = await Promise.all([
    roomId
      ? prisma.therapySession.findMany({
          where: {
            roomId,
            id: excludeSessionId ? { not: excludeSessionId } : undefined,
            scheduledDate: { lt: newEnd },
          },
          select: {
            id: true,
            scheduledDate: true,
            durationMinutes: true,
            child: { select: { fullName: true } },
          },
        })
      : Promise.resolve([]),
    assignedTherapistId
      ? prisma.therapySession.findMany({
          where: {
            assignedTherapistId,
            id: excludeSessionId ? { not: excludeSessionId } : undefined,
            scheduledDate: { lt: newEnd },
          },
          select: {
            id: true,
            scheduledDate: true,
            durationMinutes: true,
            child: { select: { fullName: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  return {
    roomConflicts: roomCandidates.filter((c) => overlaps(c, newStart, newEnd)),
    therapistConflicts: therapistCandidates.filter((c) =>
      overlaps(c, newStart, newEnd),
    ),
  };
}
```

---

## Step 4 — `packages/api/src/routers/session.ts`

### `checkConflicts` (new query)
```typescript
checkConflicts: protectedProcedure
  .input(CheckConflictsInput)
  .query(async ({ input }) => findConflicts(input)),
```

### `create` (new mutation)
1. `getPlanForTherapist`-style tenant/assignment check on `input.planId` (reuse the same guard pattern as `plan.ts`, or import it).
2. Throw `BAD_REQUEST` if `plan.status === "CLOSED"`.
3. Load the room; throw `BAD_REQUEST` if missing, wrong clinic, or `status === "MAINTENANCE"`.
4. `const { roomConflicts, therapistConflicts } = await findConflicts({ scheduledDate: input.scheduledDate, durationMinutes: input.durationMinutes, roomId: input.roomId, assignedTherapistId: input.assignedTherapistId })`.
5. If either list is non-empty and `!input.acknowledgeConflict`, throw:
   ```typescript
   throw new TRPCError({
     code: "CONFLICT",
     message: "This room or therapist is already booked for an overlapping time.",
     cause: { roomConflicts, therapistConflicts },
   });
   ```
6. `prisma.$transaction(async (tx) => { ... })`:
   - Create `TherapySession`: `{ planId, childId: plan.childId, assignedTherapistId: input.assignedTherapistId, roomId: input.roomId, scheduledDate: input.scheduledDate, durationMinutes: input.durationMinutes, status: "PENDING" }` (`webhookSecret` uses its `@default(uuid())`).
   - Create `SessionGameAssignment`: `{ sessionId: session.id, gameVersionId: input.gameVersionId, durationSeconds: input.durationSeconds, repetitions: input.repetitions, instructions: input.instructions, order: 0 }` — the existing `@@unique([sessionId])` constraint keeps "one game per session" enforced at the DB level, same guarantee as today.
7. Return the created session with `gameAssignments` included, so the frontend can navigate straight to `/sessions/$sessionId`.

### `assignRoom` (rewrite)
Replace the `RoomBooking` exact-date lookup with:
```typescript
const { roomConflicts } = await findConflicts({
  scheduledDate: session.scheduledDate,
  durationMinutes: session.durationMinutes,
  roomId: input.roomId,
  excludeSessionId: session.id,
});
if (roomConflicts.length > 0 && !input.acknowledgeConflict) {
  throw new TRPCError({ code: "CONFLICT", message: "Room is already booked for an overlapping time.", cause: { roomConflicts } });
}
await prisma.therapySession.update({ where: { id: session.id }, data: { roomId: input.roomId } });
```
No more `RoomBooking` create, no more transaction — it's a single update.

### Everything else in `session.ts` (`listForPlan`, `listForChild`, `listForToday`, `listForWeek`, `listNeedingNotes`, `getCalendar`, `get`, `markAbsent`, `manualClose`, `addNotes`, `getWebhookUrl`, `claimCoverage`, `listUncovered`): **unchanged.** `durationMinutes` flows through automatically as a plain new column wherever a session is selected/included.

---

## Step 5 — `packages/api/src/routers/plan.ts`

- Remove `import { generateSessionsForPlan, regenerateFutureSessions } from "../services/session-generator"` and both call sites.
- Remove `AddGameInput`/`UpdateGameInput`/`ReorderGamesInput` imports.
- `getPlanForTherapist`'s `include` (if any): remove `gameAssignments`.
- `create`: remove `phases: input.phases ?? []` from `planData`.
- Delete procedures wholesale: `addGame`, `removeGame`, `updateGame`, `reorderGames`, `checkSessionDuration`.
- `activate`: becomes just
  ```typescript
  const plan = await getPlanForTherapist(input.planId, ctx);
  if (plan.status !== "DRAFT" && plan.status !== "PAUSED") {
    throw new TRPCError({ code: "BAD_REQUEST" });
  }
  return prisma.treatmentPlan.update({
    where: { id: plan.id },
    data: { status: "ACTIVE", isActive: true },
  });
  ```
  (No more generation call.)
- `modify`: inside the transaction, remove `const assignments = await tx.planGameAssignment.findMany(...)`, remove the `tx.planGameAssignment.createMany(...)` copy step, remove `phases: ...` from the new plan's `create` data, and remove the post-transaction `regenerateFutureSessions(current.id, newPlan.id, new Date())` call entirely. The new plan version is created with **zero sessions** — the therapist adds them manually. Old sessions stay attached to `current.id` as history.
- `listPresets`: unchanged.

---

## Step 6 — `packages/api/src/routers/dashboard.ts`

Rewrite the room-occupancy block (currently ~line 432-465, joining `RoomBooking` for today's date):

```typescript
// before: prisma.roomBooking.findMany({ where: { roomId: { in: ... }, scheduledDate: {...} }, select: { roomId, claimedById } })
const todaySessions = await prisma.therapySession.findMany({
  where: {
    roomId: { in: allRooms.map((r) => r.id) },
    scheduledDate: { gte: today, lt: tomorrow },
  },
  select: { roomId: true, assignedTherapistId: true },
});
```
Use `assignedTherapistId` in place of `claimedById` for the subsequent therapist-name lookup (`therapistIdToName`) — rest of the shaping logic (`bookedRoomIds`, per-room occupying-therapist mapping) stays structurally the same, just sourced from `TherapySession` instead of `RoomBooking`.

`planAdherenceRate`, `therapistLoad`, `topCategoriesByActivity` (computed via `TherapySession`/`SessionGameAssignment` groupBy) need **no code change** — they already query sessions directly, independent of how those sessions were created.

**Semantic note (no code change, just worth knowing):** `planAdherenceRate` used to implicitly mean "% of the auto-generated expected schedule completed." With manual creation, there's no independent "expected session count" anymore — the metric becomes "% of manually-scheduled sessions this week that were completed." Consider a copy/tooltip update in FE-16 if this distinction matters to clinic admins.

---

## Step 7 — `packages/api/src/routers/child.ts`

In the hard-delete-child transaction, remove:
```typescript
await tx.roomBooking.deleteMany({ where: { sessionId: { in: sessionIds } } });   // DELETE
await tx.planGameAssignment.deleteMany({ where: { planId: { in: planIds } } });  // DELETE (exact where-clause may vary — check current code)
```
Verify the `planIds`/`sessionIds`/`goalIds` variables computed nearby are still used by the remaining goal/session cascade deletes before touching anything else in that function — do not remove variables still in use.

---

## Out of Scope (verified untouched)

- `apps/server/src/index.ts` webhook `/api/sessions/:id/start` and `/api/sessions/:id/complete` — only ever touch `TherapySession`/`GameResult` by `sessionId`, never reference `RoomBooking`, `PlanGameAssignment`, `phases`, or the generator. No changes.
- `Game`, `GameVersion`, `GameCategory`, `ClinicGameEnable`, `game.ts` router — untouched.
- `GameResult` shape, `SessionGameAssignment` shape — untouched.
- Goal lifecycle (`goal.ts`, `applyPlanModificationDecisions`, `FollowUpAssessment`, `GoalProgressEntry`) — untouched; verified zero references to `phases`/`PlanGameAssignment`/generation.
- `assessment.ts` (Initial Assessment) — verified zero references to any model/procedure touched by this issue.

---

## Reference docs to update

Two root-level HTML reference pages document the *current* generation-first behavior and must be rewritten so they don't mislead future readers:

- **`treatment-plan-lifecycle.html`** — its "Active ⇄ Paused" stage documents `plan.activate` → `generateSessionsForPlan` and `plan.modify` → `regenerateFutureSessions`, plus a "Manage activities" action block for `plan.addGame/removeGame/updateGame/reorderGames`. Rewrite to reflect: `activate` only flips status; `modify` versions the plan with zero sessions carried over; "Manage activities" is replaced by pointing at manual per-session creation (`session.create`) as the only way games get attached — no plan-level pool. The "Sessions (spawned by an active plan)" supporting card's framing changes from "spawned by" to "manually created by the therapist, attached to the plan."
- **`one-game-per-session.html`** — this entire document explains why round-robin distribution was introduced to fix the generator's cross-join bug. Once `session-generator.ts` is deleted, that history is moot: one-game-per-session is no longer an emergent fix, it's simply the direct result of a therapist picking one game at session-creation time. Rewrite (or substantially trim) to drop "The problem this replaces" and "The fix: round-robin distribution" sections, replacing them with a short explanation of the current model. Update the duration-check section (§05) since `plan.checkSessionDuration` is deleted — the concern is now checked per-session at creation time, not at the plan level.

---

## Verification

1. `pnpm db:migrate` applies cleanly against a fresh/reset dev DB.
2. `pnpm db:generate && pnpm check-types` passes with zero errors — this surfaces any missed reference to `PlanGameAssignment`/`phases`/`RoomBooking`/`appliesToPhase` as a compile error.
3. `grep -rn "PlanGameAssignment\|RoomBooking\|appliesToPhase\|generateSessionsForPlan\|regenerateFutureSessions" packages apps` returns zero hits (excluding this plan doc and migration SQL history).
4. `session.create` with non-overlapping room/therapist/time → creates one `TherapySession` + one `SessionGameAssignment`, zero conflicts returned.
5. `session.create` with an overlapping room, `acknowledgeConflict: false` → throws `CONFLICT` with `roomConflicts` populated; resubmitting with `acknowledgeConflict: true` succeeds. Repeat for `assignedTherapistId` overlap.
6. `session.checkConflicts` called independently (without creating) returns the same conflict lists as `create` would compute, for live UI warnings.
7. `session.assignRoom` correctly excludes the session being reassigned from its own conflict check (no self-conflict).
8. `plan.activate` no longer creates any `TherapySession` rows; `plan.modify` creates a new plan version with zero sessions, old plan's sessions remain queryable via `session.listForPlan({ planId: oldPlanId })`.
9. Dashboard `roomUtilisation` reflects today's manually-created sessions correctly post-rewrite.
10. Webhook regression: `POST /api/sessions/:id/start` then `/complete` against a manually-created session behaves byte-for-byte as before (idempotent re-post, correct `GameResult` creation).
