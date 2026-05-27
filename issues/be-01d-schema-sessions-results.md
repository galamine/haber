# BE-01d: Schema Migration — Sessions & Game Results Domain

## What to build

Add TherapySession, SessionGameAssignment, and GameResult Prisma models. Note: `Session` already exists for auth/refresh token management — the new therapy session model must have a distinct name (`TherapySession`) to avoid conflicts.

**Packages:** `packages/api`

### New Prisma models

```prisma
model TherapySession {
  id                String        @id @default(uuid())
  planId            String
  childId           String
  assignedTherapistId String?
  roomId            String?
  scheduledDate     DateTime
  startedAt         DateTime?
  completedAt       DateTime?
  status            SessionStatus @default(PENDING)
  webhookSecret     String        @default(uuid())
  webhookSecretUsed Boolean       @default(false)
  notes             String?
  qualityTag        String?       // calm | distracted | refused
  blockedByConsent  Boolean       @default(false)
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  plan            TreatmentPlan        @relation(fields: [planId], references: [id])
  gameAssignments SessionGameAssignment[]
  result          GameResult?

  @@index([planId])
  @@index([childId])
  @@index([scheduledDate])
}

enum SessionStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  ABSENT
  MANUALLY_CLOSED
}

model SessionGameAssignment {
  id             String  @id @default(uuid())
  sessionId      String
  gameVersionId  String
  durationSeconds Int?
  repetitions    Int?
  instructions   String?
  rubricVersion  String?
  order          Int     @default(0)

  session     TherapySession @relation(fields: [sessionId], references: [id])
  gameVersion GameVersion    @relation(fields: [gameVersionId], references: [id])
  result      GameResult?
}

model GameResult {
  id                    String   @id @default(uuid())
  sessionId             String   @unique
  sessionAssignmentId   String?  @unique
  scored                Json     // { score, rubric_version }
  rubricVersion         String
  rawMetrics            Json     @default("{}")
  events                Json     @default("[]")
  recordedAt            DateTime @default(now())

  session    TherapySession        @relation(fields: [sessionId], references: [id])
  assignment SessionGameAssignment? @relation(fields: [sessionAssignmentId], references: [id])
}

// Room booking: link TherapySession to SensoryRoom with conflict detection
model RoomBooking {
  id             String   @id @default(uuid())
  sessionId      String   @unique
  roomId         String
  scheduledDate  DateTime
  claimedAt      DateTime @default(now())
  claimedById    String

  @@index([roomId, scheduledDate])
}
```

### Notes on naming conflict

The existing `Session` model in the schema is for auth refresh tokens. Do NOT rename it — add `TherapySession` as a new model with a distinct name. The Prisma client will expose both as `prisma.session` (auth) and `prisma.therapySession`.

### Migration

`pnpm --filter api db:migrate -- --name sessions_results_domain`

## Acceptance criteria

- [ ] `TherapySession`, `SessionGameAssignment`, `GameResult`, `RoomBooking` tables created
- [ ] `SessionStatus` enum created
- [ ] `TherapySession.webhookSecret` defaults to a new UUID per row
- [ ] `GameResult.sessionId` has a unique constraint (idempotency key)
- [ ] Existing `Session` auth table untouched
- [ ] Prisma client regenerated
- [ ] `pnpm typecheck` passes

## Blocked by

- BE-01c (needs `TreatmentPlan`, `GameVersion` FKs)
