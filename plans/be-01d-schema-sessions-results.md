# BE-01d: Sessions & Game Results Domain Schema

## Context

BE-01a through BE-01c are complete. This adds the final schema domain: therapy sessions, game assignments, results, and room bookings. `TreatmentPlan` and `GameVersion` (FK targets) already exist in `plans.prisma`. The existing `Session` model (auth refresh tokens) in `auth.prisma` must stay untouched — the new model is named `TherapySession`.

**Decisions:**
- IDs use `@default(cuid())` to match the codebase; `webhookSecret` keeps `@default(uuid())` since it's a security token
- Cross-domain `@relation` (TherapySession → TreatmentPlan, SessionGameAssignment → GameVersion) follows the spec — requires patching `plans.prisma` with back-relation arrays

---

## Steps

### 1. Create `packages/db/prisma/schema/sessions.prisma`

```prisma
enum SessionStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  ABSENT
  MANUALLY_CLOSED
}

model TherapySession {
  id                  String        @id @default(cuid())
  planId              String
  childId             String
  assignedTherapistId String?
  roomId              String?
  scheduledDate       DateTime
  startedAt           DateTime?
  completedAt         DateTime?
  status              SessionStatus @default(PENDING)
  webhookSecret       String        @default(uuid())
  webhookSecretUsed   Boolean       @default(false)
  notes               String?
  qualityTag          String?
  blockedByConsent    Boolean       @default(false)
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt

  plan            TreatmentPlan          @relation(fields: [planId], references: [id])
  gameAssignments SessionGameAssignment[]
  result          GameResult?

  @@index([planId])
  @@index([childId])
  @@index([scheduledDate])
  @@map("therapy_session")
}

model SessionGameAssignment {
  id              String  @id @default(cuid())
  sessionId       String
  gameVersionId   String
  durationSeconds Int?
  repetitions     Int?
  instructions    String?
  rubricVersion   String?
  order           Int     @default(0)

  session     TherapySession @relation(fields: [sessionId], references: [id])
  gameVersion GameVersion    @relation(fields: [gameVersionId], references: [id])
  result      GameResult?

  @@map("session_game_assignment")
}

model GameResult {
  id                  String   @id @default(cuid())
  sessionId           String   @unique
  sessionAssignmentId String?  @unique
  scored              Json
  rubricVersion       String
  rawMetrics          Json     @default("{}")
  events              Json     @default("[]")
  recordedAt          DateTime @default(now())

  session    TherapySession         @relation(fields: [sessionId], references: [id])
  assignment SessionGameAssignment? @relation(fields: [sessionAssignmentId], references: [id])

  @@map("game_result")
}

model RoomBooking {
  id            String   @id @default(cuid())
  sessionId     String   @unique
  roomId        String
  scheduledDate DateTime
  claimedAt     DateTime @default(now())
  claimedById   String

  @@index([roomId, scheduledDate])
  @@map("room_booking")
}
```

**Notes:**
- `childId`, `assignedTherapistId`, `roomId`, `claimedById` are raw String FKs (no `@relation`) — consistent with the cross-domain pattern for User/Child/SensoryRoom references
- `RoomBooking.sessionId` is a raw String FK (`@unique` ensures 1:1 with TherapySession, no Prisma `@relation` per spec)

### 2. Patch `packages/db/prisma/schema/plans.prisma`

Add back-relation arrays required by the cross-domain `@relation` fields:

- **`TreatmentPlan`** (after `goals Goal[]`): add `sessions TherapySession[]`
- **`GameVersion`** (after `planAssignments PlanGameAssignment[]`): add `sessionAssignments SessionGameAssignment[]`

### 3. Run migration

```bash
pnpm db:migrate -- --name sessions_results_domain
```

### 4. Verify

```bash
pnpm check-types
```

---

## Files

| File | Change |
|------|--------|
| `packages/db/prisma/schema/sessions.prisma` | New — 4 models + SessionStatus enum |
| `packages/db/prisma/schema/plans.prisma` | Add back-relation fields to TreatmentPlan and GameVersion |

---

## Acceptance criteria

- [ ] `TherapySession`, `SessionGameAssignment`, `GameResult`, `RoomBooking` tables created
- [ ] `SessionStatus` enum created
- [ ] `TherapySession.webhookSecret` defaults to a new UUID per row
- [ ] `GameResult.sessionId` has a unique constraint
- [ ] Existing `Session` auth table untouched
- [ ] Prisma client regenerated
- [ ] `pnpm check-types` passes
