# BE-01b: Schema Migration — Clinical & Child Domain

## What to build

Add all child, guardian, consent, initial assessment, sensory profile, milestone, and clinical taxonomy Prisma models. This migration unlocks child intake, assessment, and consent feature work.

**Packages:** `packages/api`

### New Prisma models

```prisma
model Child {
  id                  String        @id @default(uuid())
  clinicId            String
  opNumber            String
  fullName            String
  dob                 DateTime
  sex                 String
  photoUrl            String?
  address             String?
  heightCm            Float?
  weightKg            Float?
  weightMeasuredAt    DateTime?
  spokenLanguages     String[]
  school              String?
  preferredTherapistId String?
  consentStatus       ConsentStatus @default(PENDING)
  latestPlanId        String?
  deletedAt           DateTime?
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt

  guardians        Guardian[]
  consentRecords   ConsentRecord[]
  assessments      InitialAssessment[]
  followUps        FollowUpAssessment[]
}

enum ConsentStatus {
  PENDING
  GRANTED
  WITHDRAWN
}

model Guardian {
  id       String  @id @default(uuid())
  childId  String
  userId   String? // FK to User (loginEnabled=false)
  name     String
  relation String
  phone    String
  email    String?

  child          Child           @relation(fields: [childId], references: [id])
  consentRecords ConsentRecord[]
}

model ConsentRecord {
  id          String      @id @default(uuid())
  childId     String
  guardianId  String
  consentType ConsentType
  typedName   String
  checkbox    Boolean
  timestamp   DateTime    @default(now())
  ip          String

  child    Child    @relation(fields: [childId], references: [id])
  guardian Guardian @relation(fields: [guardianId], references: [id])
}

enum ConsentType {
  TREATMENT
  DATA_PROCESSING
  IMAGE_VIDEO_CAPTURE
}

model InitialAssessment {
  id            String   @id @default(uuid())
  childId       String
  therapistId   String
  versionNumber Int      @default(1)
  // Sections stored as structured JSONB — see clinical-data/initial-assessment.example.json
  sectionA      Json     // patient & referral info
  sectionB      Json     // medical & developmental history
  sectionC      Json     // developmental milestones (array of 12)
  sectionD      Json     // sensory processing profile (7 systems)
  sectionE      Json     // functional & fine-motor concerns
  sectionF      Json     // standardised assessment tools
  sectionG      Json     // goals & intervention plan
  sectionH      Json     // therapist & guardian signatures
  createdAt     DateTime @default(now())

  child        Child          @relation(fields: [childId], references: [id])
  sensoryProfiles SensoryProfile[]
  followUps    FollowUpAssessment[]
}

model SensoryProfile {
  id           String   @id @default(uuid())
  assessmentId String?
  followUpId   String?
  systemId     String   // FK to SensorySystem seed
  rating       Int      // 1-5 ordinal
  notes        String?
  recordedAt   DateTime @default(now())
}

model Milestone {
  id                  String  @id @default(uuid())
  frameworkId         String  @default("global")
  ageMinMonths        Int?
  ageMaxMonths        Int?
  scoringScaleMin     Int?
  scoringScaleMax     Int?
  description         String
  parentMilestoneId   String?
  extensions          Json    @default("{}")
}

// Clinical taxonomy lookup tables (seeded from clinical-taxonomies.seed.json)
model Diagnosis {
  id       String  @id @default(uuid())
  label    String
  clinicId String? // null = global
}

model FunctionalConcern {
  id       String  @id @default(uuid())
  label    String
  clinicId String?
}

model AssessmentTool {
  id       String  @id @default(uuid())
  label    String
  clinicId String?
}

model Equipment {
  id       String  @id @default(uuid())
  label    String
  clinicId String?
}

model InterventionApproach {
  id       String  @id @default(uuid())
  label    String
  clinicId String?
}

model SensorySystem {
  id    String @id @default(uuid())
  label String // Tactile, Vestibular, etc.
  order Int
}

// Child-therapist assignment (flat, multi-therapist co-ownership)
model ChildTherapistAssignment {
  id           String   @id @default(uuid())
  childId      String
  therapistId  String
  assignedAt   DateTime @default(now())
  reviewDueAt  DateTime?
  reviewClaimed Boolean @default(false)
  reviewClaimedBy String?
}
```

### Migration

`pnpm --filter api db:migrate -- --name clinical_child_domain`

## Acceptance criteria

- [ ] All listed models and enums created in the database
- [ ] `Child`, `Guardian`, `ConsentRecord`, `InitialAssessment`, `SensoryProfile`, `Milestone` tables exist
- [ ] All taxonomy tables exist: `Diagnosis`, `FunctionalConcern`, `AssessmentTool`, `Equipment`, `InterventionApproach`, `SensorySystem`
- [ ] `ChildTherapistAssignment` table exists for multi-therapist co-assignment
- [ ] Prisma client regenerated
- [ ] `pnpm typecheck` passes
- [ ] Migration file committed

## Blocked by

- BE-01a (needs `Clinic` and `User` with `clinicId` and `role`)
