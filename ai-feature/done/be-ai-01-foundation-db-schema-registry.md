# BE-AI-01: AI Documentation — Foundation: Database & Schema Registry

## Context

This is the first stage of the AI Clinical Documentation Assistant. It establishes the data models and form field registry that the AI will use as its source of truth for field mapping.

**What this solves:**
- Database models to track conversation sessions, AI-extracted draft values, and therapist overrides
- Form registry that exposes all form field definitions to the AI with aliases for matching

**Existing work to leverage:**
- Assessment form schemas in `packages/api/src/schemas/assessment.ts`
- InitialAssessment and FollowUpAssessment Prisma models in `packages/db/prisma/schema/clinical.prisma`
- FollowUpAssessment in `packages/db/prisma/schema/plans.prisma`

## Decisions

| Question | Decision |
|---|---|
| Why separate session model? | Tracks conversation lifecycle (active/paused/completed) independently of form data |
| Why override log separate? | Audit trail of therapist corrections; AI quality tracking |
| Why draft values linked to session? | Allows pause/resume without losing extracted data |
| Why status "active" vs "superseded"? | When AI re-extracts same field, old draft is marked superseded not deleted |

## Files to Create

| File | Purpose |
|---|---|
| `ai-feature/packages/db/prisma/schema/ai.prisma` | AI models: ConversationSession, AIDraftValue, AIFieldOverride |
| `ai-feature/packages/api/src/schemas/form-registry.ts` | Registry exposing all form fields with AI metadata |
| `ai-feature/packages/db/package.json` | Package manifest |
| `ai-feature/packages/db/tsconfig.json` | TypeScript config |

## Files to Modify

None — this stage creates new models that link to existing assessment records.

---

## Step 1 — Prisma AI Schema

**File:** `ai-feature/packages/db/prisma/schema/ai.prisma` (NEW)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model ConversationSession {
  id               String   @id @default(cuid())
  assessmentId     String
  assessmentType   String   // 'initial' | 'follow-up'
  status           String   @default("active") // 'active' | 'paused' | 'completed'
  transcriptHistory String? // Accumulated transcript text for full conversation
  startedAt        DateTime @default(now())
  endedAt          DateTime?

  draftValues AIDraftValue[]
  overrides   AIFieldOverride[]

  @@index([assessmentId, status])
}

model AIDraftValue {
  id         String   @id @default(cuid())
  sessionId  String
  fieldId    String   // e.g., 'sectionA.patientName'
  value      Json     // The extracted value
  confidence String   // 'high' | 'medium' | 'low'
  sourceText String?  // Transcript snippet this was extracted from
  status     String   @default("active") // 'active' | 'superseded'
  createdAt  DateTime @default(now())

  session ConversationSession @relation(fields: [sessionId], references: [id])

  @@index([sessionId, fieldId])
}

model AIFieldOverride {
  id            String   @id @default(cuid())
  sessionId     String
  fieldId       String
  aiValue       Json     // What AI had extracted
  overrideValue Json     // What therapist typed
  overrideAt    DateTime @default(now())

  session ConversationSession @relation(fields: [sessionId], references: [id])

  @@index([sessionId, fieldId])
}
```

---

## Step 2 — Package Manifest

**File:** `ai-feature/packages/db/package.json` (NEW)

```json
{
  "name": "@ai-feature/db",
  "type": "module",
  "exports": {
    ".": {
      "default": "./src/index.ts"
    },
    "./package.json": "./package.json"
  },
  "scripts": {
    "db:push": "prisma db push",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "postinstall": "prisma generate",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/adapter-pg": "^7.8.0",
    "@prisma/client": "^7.8.0",
    "dotenv": "^17.2.2",
    "pg": "^8.17.1",
    "zod": "^4.1.13"
  },
  "devDependencies": {
    "@types/pg": "^8.16.0",
    "prisma": "^7.8.0",
    "tsx": "^4.19.2",
    "typescript": "^6.0.0"
  }
}
```

---

## Step 3 — Prisma Index

**File:** `ai-feature/packages/db/prisma/schema.prisma` (NEW — entry point that imports all schema files)

```prisma
include "auth.prisma";
include "clinic.prisma";
include "clinical.prisma";
include "department.prisma";
include "plans.prisma";
include "sessions.prisma";
include "sensory_room.prisma";
include "staff.prisma";
include "ai.prisma";
```

**Note:** The main Haber app uses a multi-file Prisma schema pattern. For the ai-feature self-contained module, the Prisma schema is standalone and not integrated with the main `packages/db`. The ai-feature/db package would have its own database connection. For integration, consider either:
1. Shared DATABASE_URL pointing to same database — ai schema files get included in main `packages/db/prisma/schema/` directory
2. Separate database for AI features (not recommended — adds complexity)

**Recommendation:** Add the ai.prisma content directly to `packages/db/prisma/schema/` so it shares the same database and Prisma client as the main app. Then `@ai-feature/db` becomes a thin wrapper that re-exports from `@haber-final/db`.

---

## Step 4 — Form Registry

**File:** `ai-feature/packages/api/src/schemas/form-registry.ts` (NEW)

```typescript
export const formRegistry = {
  initialAssessment: {
    id: 'initial-assessment',
    sections: [
      {
        id: 'section-a',
        name: 'Patient & Referral Information',
        fields: [
          { id: 'sectionA.patientName', label: 'Patient Name', type: 'string', aliases: ['child name', 'patient name', 'name'] },
          { id: 'sectionA.dob', label: 'Date of Birth', type: 'date', aliases: ['DOB', 'birth date', 'born on'] },
          { id: 'sectionA.age', label: 'Age', type: 'object', fields: ['years', 'months'], aliases: ['years old', 'age is', 'yr', 'month'] },
          { id: 'sectionA.gender', label: 'Gender', type: 'enum', values: ['Male', 'Female', 'Other', 'Prefer not to say'], aliases: [] },
          { id: 'sectionA.assessmentDate', label: 'Assessment Date', type: 'date', aliases: ['assessment done on', 'evaluated on'] },
          { id: 'sectionA.location', label: 'Assessment Location', type: 'string', aliases: ['place', 'location'] },
          { id: 'sectionA.referringTherapist', label: 'Referring Therapist / Doctor', type: 'string', aliases: ['referred by', 'referring doctor'] },
          { id: 'sectionA.referralSource', label: 'Referral Source', type: 'string', aliases: ['referral', 'source of referral'] },
          { id: 'sectionA.caregiverName', label: 'Primary Caregiver Name', type: 'string', aliases: ['parent name', 'guardian name', 'mother name', 'father name'] },
          { id: 'sectionA.caregiverRelation', label: 'Relationship to Child', type: 'string', aliases: ['relation', 'relationship'] },
          { id: 'sectionA.caregiverContact', label: 'Contact Number', type: 'string', aliases: ['phone', 'mobile', 'telephone', 'contact', '+91'] },
          { id: 'sectionA.caregiverEmail', label: 'Email Address', type: 'string', aliases: ['email', 'e-mail'] },
          { id: 'sectionA.chiefComplaint', label: 'Chief Complaint', type: 'string', aliases: ['complaint', 'presenting problem', 'reason for visit'] },
        ]
      },
      {
        id: 'section-b',
        name: 'Medical History',
        fields: [
          { id: 'sectionB.primaryDiagnoses', label: 'Primary Diagnoses', type: 'array-string', aliases: ['diagnosis', 'diagnosed with', 'condition'] },
          { id: 'sectionB.prenatalHistory', label: 'Prenatal History', type: 'string', aliases: ['pregnancy', 'prenatal', 'before birth'] },
          { id: 'sectionB.birthHistory', label: 'Birth History', type: 'string', aliases: ['birth', 'delivery', 'born'] },
          { id: 'sectionB.neonatalHistory', label: 'Neonatal History', type: 'string', aliases: ['neonatal', 'after birth', 'newborn'] },
          { id: 'sectionB.gestationalAgeWeeks', label: 'Gestational Age (weeks)', type: 'number', aliases: ['weeks gestation', 'preterm', 'full term'] },
          { id: 'sectionB.medicalHistory', label: 'Medical History', type: 'string', aliases: ['medical', 'past medical'] },
          { id: 'sectionB.currentMedications', label: 'Current Medications', type: 'string', aliases: ['medications', 'medicine', 'taking'] },
          { id: 'sectionB.allergies', label: 'Allergies', type: 'string', aliases: ['allergy', 'allergic'] },
          { id: 'sectionB.previousTherapies', label: 'Previous Therapies', type: 'string', aliases: ['previous therapy', 'past therapy'] },
        ]
      },
      {
        id: 'section-c',
        name: 'Developmental Milestones',
        fields: [
          { id: 'sectionC.milestones', label: 'Milestones', type: 'array-object', aliases: ['milestone', 'development', 'developmental'] },
        ]
      },
      {
        id: 'section-d',
        name: 'Sensory Profile',
        fields: [
          { id: 'sectionD.sensoryProfile', label: 'Sensory Profile', type: 'array-object', aliases: ['sensory', 'sensory profile'] },
          { id: 'sectionD.behaviouralObservations', label: 'Behavioural Observations', type: 'array-string', aliases: ['behaviour', 'behavior', 'observation'] },
        ]
      },
      {
        id: 'section-e',
        name: 'Functional Concerns',
        fields: [
          { id: 'sectionE.functionalConcerns', label: 'Functional Concerns', type: 'array-string', aliases: ['concerns', 'functional', 'difficulties'] },
          { id: 'sectionE.observations', label: 'Observations', type: 'array-string', aliases: ['observation', 'observed'] },
        ]
      },
      {
        id: 'section-f',
        name: 'Assessment Tools',
        fields: [
          { id: 'sectionF.toolsAdministered', label: 'Tools Administered', type: 'array-object', aliases: ['tool', 'assessment tool', 'test'] },
          { id: 'sectionF.overallSummary', label: 'Overall Summary', type: 'string', aliases: ['summary', 'overall'] },
        ]
      },
      {
        id: 'section-g',
        name: 'Goals & Intervention',
        fields: [
          { id: 'sectionG.shortTermGoals', label: 'Short Term Goals', type: 'array-object', aliases: ['short term goal', 'stg'] },
          { id: 'sectionG.longTermGoals', label: 'Long Term Goals', type: 'array-object', aliases: ['long term goal', 'ltg'] },
          { id: 'sectionG.recommendedFrequency', label: 'Recommended Frequency', type: 'number', aliases: ['frequency', 'sessions per week'] },
          { id: 'sectionG.sessionDurationMinutes', label: 'Session Duration (minutes)', type: 'number', aliases: ['duration', 'session length'] },
          { id: 'sectionG.interventionSetting', label: 'Intervention Setting', type: 'string', aliases: ['setting', 'environment'] },
          { id: 'sectionG.reviewPeriodWeeks', label: 'Review Period (weeks)', type: 'number', aliases: ['review', 'review period'] },
          { id: 'sectionG.homeProgramRecommendations', label: 'Home Program Recommendations', type: 'string', aliases: ['home program', 'homework'] },
          { id: 'sectionG.equipment', label: 'Equipment', type: 'array-string', aliases: ['equipment', 'aids'] },
          { id: 'sectionG.referrals', label: 'Referrals', type: 'string', aliases: ['referral', 'referred'] },
        ]
      },
      {
        id: 'section-h',
        name: 'Signatures & Consent',
        fields: [
          { id: 'sectionH.therapistName', label: 'Therapist Name', type: 'string', aliases: [] },
          { id: 'sectionH.guardianName', label: 'Guardian Name', type: 'string', aliases: [] },
          { id: 'sectionH.consentObtained', label: 'Consent Obtained', type: 'boolean', aliases: ['consent'] },
        ]
      },
    ]
  },
  followUpAssessment: {
    id: 'follow-up-assessment',
    sections: [
      {
        id: 'section-a',
        name: 'Session Info',
        fields: [
          { id: 'sectionA.date', label: 'Date', type: 'date', aliases: ['session date'] },
          { id: 'sectionA.sessionNumber', label: 'Session Number', type: 'number', aliases: ['session', 'session number'] },
          { id: 'sectionA.weeksSinceInitial', label: 'Weeks Since Initial', type: 'number', aliases: ['weeks', 'since initial'] },
          { id: 'sectionA.parentPresent', label: 'Parent Present', type: 'boolean', aliases: ['parent', 'caregiver present'] },
        ]
      },
      {
        id: 'section-b',
        name: 'Goal Progress',
        fields: [
          { id: 'sectionB.goalProgress', label: 'Goal Progress', type: 'array-object', aliases: ['goal', 'progress', 'goal progress'] },
        ]
      },
      {
        id: 'section-c',
        name: 'Sensory Progress',
        fields: [
          { id: 'sectionC.sensoryCheck', label: 'Sensory Check', type: 'array-object', aliases: ['sensory', 'sensory progress'] },
        ]
      },
      {
        id: 'section-d',
        name: 'Clinical Questions',
        fields: [
          { id: 'sectionD.improvementsAtHome', label: 'Improvements at Home', type: 'array-string', aliases: ['home improvement', 'improved at home'] },
          { id: 'sectionD.improvementsAtSchool', label: 'Improvements at School', type: 'array-string', aliases: ['school improvement', 'improved at school'] },
          { id: 'sectionD.regressions', label: 'Regressions', type: 'string', aliases: ['regression', 'regressed'] },
          { id: 'sectionD.homeProgramCompliance', label: 'Home Program Compliance', type: 'string', aliases: ['compliance', 'home program'] },
          { id: 'sectionD.sessionEngagement', label: 'Session Engagement', type: 'string', aliases: ['engagement', 'engaged'] },
          { id: 'sectionD.schoolPerformanceChanges', label: 'School Performance Changes', type: 'array-string', aliases: ['school', 'academic'] },
          { id: 'sectionD.behaviourChanges', label: 'Behaviour Changes', type: 'array-string', aliases: ['behaviour', 'behavior', 'changed'] },
          { id: 'sectionD.newSkillsObserved', label: 'New Skills Observed', type: 'array-string', aliases: ['new skill', 'learned', 'newly'] },
          { id: 'sectionD.equipmentEffectivelyUsed', label: 'Equipment Effectively Used', type: 'array-string', aliases: ['equipment', 'used'] },
          { id: 'sectionD.therapistObservations', label: 'Therapist Observations', type: 'array-string', aliases: ['observation', 'observed'] },
        ]
      },
      {
        id: 'section-e',
        name: 'Plan Adjustments',
        fields: [
          { id: 'sectionE.goalStatusDecisions', label: 'Goal Status Decisions', type: 'array-string', aliases: ['goal decision', 'status'] },
          { id: 'sectionE.updatedGoals', label: 'Updated Goals', type: 'array-object', aliases: ['updated goal', 'new goal'] },
          { id: 'sectionE.updatedHomeProgram', label: 'Updated Home Program', type: 'string', aliases: ['home program', 'updated'] },
          { id: 'sectionE.nextFollowUpDate', label: 'Next Follow-up Date', type: 'string', aliases: ['next follow up', 'follow up date'] },
          { id: 'sectionE.nextAssessmentType', label: 'Next Assessment Type', type: 'string', aliases: ['next assessment'] },
          { id: 'sectionE.clinicalNotes', label: 'Clinical Notes', type: 'string', aliases: ['notes', 'clinical notes'] },
        ]
      },
      {
        id: 'section-f',
        name: 'Signatures',
        fields: [
          { id: 'sectionF.therapistName', label: 'Therapist Name', type: 'string', aliases: [] },
          { id: 'sectionF.guardianName', label: 'Guardian Name', type: 'string', aliases: [] },
        ]
      },
    ]
  }
} as const;
```

---

## Step 5 — TypeScript Types

**File:** `ai-feature/packages/api/src/schemas/ai-types.ts` (NEW)

```typescript
export interface FieldDefinition {
  id: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'array-string' | 'array-object' | 'object';
  values?: string[];           // for enum type
  fields?: string[];           // for object type
  aliases?: string[];          // alternative phrases AI uses to match this field
}

export interface SectionDefinition {
  id: string;
  name: string;
  fields: FieldDefinition[];
}

export interface FormDefinition {
  id: string;
  sections: SectionDefinition[];
}
```

---

## Verification

- [ ] Prisma schema validates (`pnpm db:generate` runs successfully)
- [ ] Form registry includes all fields from Initial Assessment (sections A–H)
- [ ] Form registry includes all fields from Follow-up Assessment (sections A–F)
- [ ] Every field has appropriate aliases for AI matching
- [ ] Types are consistent with existing `AssessmentFormValues` from main app

## Blocked by

Nothing — can start immediately
