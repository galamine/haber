# Plan: BE-01c — Plans & Goals Domain Schema

## Context

This issue adds the treatment-planning and game-library domain to the Prisma schema. It is blocked by BE-01b (which created `Child` and `InitialAssessment`), both of which already exist in `clinical.prisma`. The task creates one new file — `plans.prisma` — runs a migration, regenerates the client, and verifies types.

## Decisions

| Question | Decision |
|---|---|
| ID generation | `cuid()` — consistent with all existing models (auth, clinic, clinical) |
| `@@map()` directives | Add on every model — matches existing convention |
| `sessions TherapySession[]` on `TreatmentPlan` | **Omit** — `TherapySession` doesn't exist yet; same precedent as BE-01b omitting `FollowUpAssessment` back-refs |
| Cross-domain FKs (`childId`, `clinicId`, `createdById`, `therapistId`) | Raw `String` fields, no Prisma `@relation` — matches `Guardian.userId`, `Child.preferredTherapistId` pattern; no changes to `clinical.prisma` or `auth.prisma` |
| Self-referential FKs (`parentPlanId`, `supersededByGoalId`, `parentId`) | Raw `String?` fields, no Prisma `@relation` — matches `Milestone.parentMilestoneId` pattern |
| `GoalProgressEntry.followUpId` | Raw `String` field, no `@relation` to `FollowUpAssessment` — consistent with raw-FK pattern |

## Step 1 — Create `packages/db/prisma/schema/plans.prisma`

Single new file. No existing files are modified.

```prisma
enum PlanStatus {
  DRAFT
  ACTIVE
  PAUSED
  COMPLETED
  CLOSED
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

model TreatmentPlan {
  id                     String     @id @default(cuid())
  childId                String
  clinicId               String
  createdById            String
  name                   String
  programLengthWeeks     Int
  phases                 Json       @default("[]")
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

  gameAssignments PlanGameAssignment[]
  goals           Goal[]

  @@map("treatment_plan")
}

model PlanGameAssignment {
  id               String  @id @default(cuid())
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

  @@map("plan_game_assignment")
}

model Goal {
  id                   String      @id @default(cuid())
  treatmentPlanId      String
  description          String
  horizon              GoalHorizon
  targetAttainmentPct  Int         @default(100)
  currentAttainmentPct Int         @default(0)
  status               GoalStatus  @default(IN_PROGRESS)
  supersededByGoalId   String?
  createdAt            DateTime    @default(now())

  plan            TreatmentPlan       @relation(fields: [treatmentPlanId], references: [id])
  progressEntries GoalProgressEntry[]

  @@map("goal")
}

model GoalProgressEntry {
  id            String     @id @default(cuid())
  goalId        String
  followUpId    String
  attainmentPct Int
  status        GoalStatus
  evidenceNotes String?
  recordedAt    DateTime   @default(now())

  goal Goal @relation(fields: [goalId], references: [id])

  @@map("goal_progress_entry")
}

model FollowUpAssessment {
  id                  String   @id @default(cuid())
  childId             String
  initialAssessmentId String
  treatmentPlanId     String
  previousFollowUpId  String?
  therapistId         String
  versionNumber       Int      @default(1)
  sectionA            Json
  sectionB            Json
  sectionC            Json
  sectionD            Json
  sectionE            Json
  sectionF            Json
  createdAt           DateTime @default(now())

  @@map("follow_up_assessment")
}

model GameCategory {
  id       String  @id @default(cuid())
  name     String
  clinicId String?
  parentId String?

  games Game[]

  @@map("game_category")
}

model Game {
  id           String   @id @default(cuid())
  name         String
  description  String?
  categoryId   String
  subCategory  String?
  targetIssues String[]
  difficulty   String?
  ageRangeMin  Int?
  ageRangeMax  Int?
  isGlobal     Boolean  @default(true)
  createdAt    DateTime @default(now())

  category      GameCategory       @relation(fields: [categoryId], references: [id])
  versions      GameVersion[]
  clinicEnables ClinicGameEnable[]

  @@map("game")
}

model GameVersion {
  id            String   @id @default(cuid())
  gameId        String
  versionNumber String
  isLatest      Boolean  @default(false)
  rubricVersion String
  scoringSchema Json     @default("{}")
  createdAt     DateTime @default(now())

  game            Game                 @relation(fields: [gameId], references: [id])
  planAssignments PlanGameAssignment[]

  @@map("game_version")
}

model ClinicGameEnable {
  id       String  @id @default(cuid())
  clinicId String
  gameId   String
  enabled  Boolean @default(true)

  game Game @relation(fields: [gameId], references: [id])

  @@unique([clinicId, gameId])
  @@map("clinic_game_enable")
}
```

## Step 2 — Run migration

```bash
pnpm db:migrate -- --name plans_goals_domain
```

Creates a timestamped migration under `packages/db/prisma/migrations/` and regenerates the Prisma client automatically.

## Step 3 — Verify types

```bash
pnpm check-types
```

Must exit 0.

## Files

- **Create:** `packages/db/prisma/schema/plans.prisma`
- **Auto-generated:** `packages/db/prisma/generated/` (never edit manually)
- **Auto-created:** `packages/db/prisma/migrations/<timestamp>_plans_goals_domain/migration.sql`

## Verification

1. `pnpm db:migrate` exits 0 with "Your database is now in sync with your schema"
2. All 9 tables exist: `treatment_plan`, `plan_game_assignment`, `goal`, `goal_progress_entry`, `follow_up_assessment`, `game_category`, `game`, `game_version`, `clinic_game_enable`
3. All 3 enums exist: `PlanStatus`, `GoalHorizon`, `GoalStatus`
4. `pnpm check-types` exits 0
