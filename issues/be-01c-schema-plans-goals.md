# BE-01c: Schema Migration — Plans & Goals Domain

## What to build

Add TreatmentPlan, PlanGameAssignment, Goal, GoalProgressEntry, Game, GameVersion, and GameCategory Prisma models. Also add FollowUpAssessment, which is structurally tied to both assessments and plans.

**Packages:** `packages/db`

### New Prisma models

Create `packages/db/prisma/schema/plans.prisma` with the following models:

```prisma
model TreatmentPlan {
  id                   String     @id @default(uuid())
  childId              String
  clinicId             String
  createdById          String
  name                 String
  programLengthWeeks   Int
  phases               Json       @default("[]") // [{phase, weeks, label}]
  startDate            DateTime?
  projectedEndDate     DateTime?
  targetMilestones     String[]
  status               PlanStatus @default(DRAFT)
  isActive             Boolean    @default(false)
  versionNumber        Int        @default(1)
  parentPlanId         String?    // FK to previous version
  sourcePresetId       String?    // analytics only
  sessionDurationMinutes Int      @default(60)
  closureReason        String?
  outcomeSummary       String?
  createdAt            DateTime   @default(now())
  updatedAt            DateTime   @updatedAt

  gameAssignments PlanGameAssignment[]
  goals           Goal[]
  sessions        TherapySession[]
}

enum PlanStatus {
  DRAFT
  ACTIVE
  PAUSED
  COMPLETED
  CLOSED
}

model PlanGameAssignment {
  id               String  @id @default(uuid())
  planId           String
  gameVersionId    String
  durationSeconds  Int?
  repetitions      Int?
  frequencyPerWeek Int?
  instructions     String?
  appliesToPhase   String?
  order            Int     @default(0)

  plan        TreatmentPlan @relation(fields: [planId], references: [id])
  gameVersion GameVersion   @relation(fields: [gameVersionId], references: [id])
}

model Goal {
  id                   String     @id @default(uuid())
  treatmentPlanId      String
  description          String
  horizon              GoalHorizon
  targetAttainmentPct  Int        @default(100)
  currentAttainmentPct Int        @default(0)
  status               GoalStatus @default(IN_PROGRESS)
  supersededByGoalId   String?    // FK to replacement goal on plan modification
  createdAt            DateTime   @default(now())

  plan            TreatmentPlan      @relation(fields: [treatmentPlanId], references: [id])
  progressEntries GoalProgressEntry[]
}

enum GoalHorizon {
  SHORT_TERM
  LONG_TERM
}

enum GoalStatus {
  MET
  IN_PROGRESS
  NOT_MET
  DISCONTINUED
}

model GoalProgressEntry {
  id            String     @id @default(uuid())
  goalId        String
  followUpId    String
  attainmentPct Int
  status        GoalStatus
  evidenceNotes String?
  recordedAt    DateTime   @default(now())

  goal Goal @relation(fields: [goalId], references: [id])
}

model FollowUpAssessment {
  id                  String   @id @default(uuid())
  childId             String
  initialAssessmentId String
  treatmentPlanId     String
  previousFollowUpId  String?
  therapistId         String
  versionNumber       Int      @default(1)
  sectionA            Json     // session info
  sectionB            Json     // goal progress review
  sectionC            Json     // sensory progress check
  sectionD            Json     // follow-up clinical questions
  sectionE            Json     // plan adjustment & next steps
  sectionF            Json     // signatures
  createdAt           DateTime @default(now())
}

model GameCategory {
  id       String        @id @default(uuid())
  name     String
  clinicId String?       // null = global
  parentId String?       // for sub-categories

  games    Game[]
}

model Game {
  id          String  @id @default(uuid())
  name        String
  description String?
  categoryId  String
  subCategory String?
  targetIssues String[]
  difficulty  String?
  ageRangeMin Int?
  ageRangeMax Int?
  isGlobal    Boolean @default(true)
  createdAt   DateTime @default(now())

  category GameCategory  @relation(fields: [categoryId], references: [id])
  versions GameVersion[]
  clinicEnables ClinicGameEnable[]
}

model GameVersion {
  id            String   @id @default(uuid())
  gameId        String
  versionNumber String
  isLatest      Boolean  @default(false)
  rubricVersion String
  scoringSchema Json     @default("{}")
  createdAt     DateTime @default(now())

  game            Game                @relation(fields: [gameId], references: [id])
  planAssignments PlanGameAssignment[]
}

model ClinicGameEnable {
  id       String  @id @default(uuid())
  clinicId String
  gameId   String
  enabled  Boolean @default(true)

  game Game @relation(fields: [gameId], references: [id])
  @@unique([clinicId, gameId])
}
```

### Migration

`pnpm db:migrate -- --name plans_goals_domain`

## Acceptance criteria

- [ ] `TreatmentPlan`, `PlanGameAssignment`, `Goal`, `GoalProgressEntry`, `FollowUpAssessment` tables created
- [ ] `Game`, `GameVersion`, `GameCategory`, `ClinicGameEnable` tables created
- [ ] `PlanStatus`, `GoalHorizon`, `GoalStatus` enums created
- [ ] Self-referential FKs work: `TreatmentPlan.parentPlanId`, `Goal.supersededByGoalId`, `GameCategory.parentId`
- [ ] Prisma client regenerated
- [ ] `pnpm check-types` passes

## Blocked by

- BE-01b (needs `Child`, `InitialAssessment` FKs)
