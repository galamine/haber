# 008 — Assessment Backend Plan

## Context
Creates the `Assessment` model and backend API for Form 1. Assessments are append-only and versioned per child. This is the scaffold that issues 009 (signatures) and 010 (treatment plan) extend.

Blocked by: 005 (intake), 006 (consent), 007 (taxonomy seeding).

## Decisions
- Routes: child-scoped (`/v1/children/:childId/assessments`)
- Role: `therapist` = clinical user; `child.assessment` right for both therapist + clinic_admin
- Visibility: therapist sees ALL assessments for any child they are assigned to (via `ChildTherapist`)
- `findings`: `{ [sensorySytemId: string]: { notes: string } }` — SensorySystem IDs as keys
- `chiefComplaintTags`: array of FunctionalConcern IDs
- `MedicalHistorySnapshot`: snapshots all MedicalHistory fields at creation time
- Two new fields added to `MedicalHistory` here: `prenatalHistory` and `previousTherapies`
- Version auto-increment: app-level `MAX(version)+1` inside transaction; unique on `(childId, version)`
- Draft enforcement: app-level 409 `DRAFT_EXISTS` (no partial unique index)

## Schema Changes

### `MedicalHistory` (extend)
```prisma
prenatalHistory    String?  @map("prenatal_history")
previousTherapies  Json     @default("[]") @map("previous_therapies")
// previousTherapies shape: { name: string; durationMonths: number | null }[]
```

### New enum
```prisma
enum AssessmentStatus {
  draft
  finalised
}
```

### New `Assessment` model
```prisma
model Assessment {
  id                     String           @id @default(uuid())
  childId                String           @map("child_id")
  tenantId               String           @map("tenant_id")
  version                Int
  status                 AssessmentStatus @default(draft)
  assessmentDate         DateTime         @db.Date @map("assessment_date")
  assessmentLocation     String?          @map("assessment_location")
  referringDoctor        String?          @map("referring_doctor")
  referralSource         String?          @map("referral_source")
  chiefComplaint         String?          @map("chief_complaint")
  chiefComplaintTags     Json             @default("[]") @map("chief_complaint_tags")
  observations           String?
  findings               Json             @default("{}")
  notes                  String?
  primaryDiagnosisIds    Json             @default("[]") @map("primary_diagnosis_ids")
  medicalHistorySnapshot Json?            @map("medical_history_snapshot")
  recordedByUserId       String           @map("recorded_by_user_id")
  createdAt              DateTime         @default(now()) @map("created_at")
  updatedAt              DateTime         @updatedAt @map("updated_at")

  child      Child  @relation(fields: [childId], references: [id])
  clinic     Clinic @relation(fields: [tenantId], references: [id])
  recordedBy User   @relation("RecordedAssessments", fields: [recordedByUserId], references: [id])

  @@unique([childId, version])
  @@index([childId, version])
  @@index([tenantId])
  @@map("assessments")
}
```

## Shared Package Changes
- `packages/shared/src/schemas/assessment.schema.ts` — new
- `packages/shared/src/schemas/child.schema.ts` — add `prenatalHistory`, `previousTherapies` to `UpsertMedicalHistoryDtoSchema` and `MedicalHistoryDtoSchema`
- `packages/shared/src/constants/roles.ts` — add `child.assessment` to therapist + clinic_admin
- `packages/shared/src/schemas/index.ts` — add export
- `packages/shared/src/dtos/index.ts` — add type re-exports

## Backend Files
| File | Action |
|---|---|
| `apps/backend/prisma/schema.prisma` | Modify |
| `apps/backend/src/validations/assessment.validation.ts` | Create |
| `apps/backend/src/services/assessment.service.ts` | Create |
| `apps/backend/src/controllers/assessment.controller.ts` | Create |
| `apps/backend/src/routes/v1/child.route.ts` | Modify — add assessment sub-routes |
| `apps/backend/src/services/index.ts` | Modify — export assessmentService |
| `apps/backend/tests/integration/assessment.test.ts` | Create |
| `apps/backend/tests/utils/setupTestDB.ts` | Modify — add assessment cleanup |

## API Endpoints
| Method | Path | Right | Description |
|---|---|---|---|
| POST | `/v1/children/:childId/assessments` | `child.assessment` | Create draft |
| GET | `/v1/children/:childId/assessments` | `child.assessment` | List all |
| GET | `/v1/children/:childId/assessments/:assessmentId` | `child.assessment` | Get one |
| PATCH | `/v1/children/:childId/assessments/:assessmentId` | `child.assessment` | Update draft |
| POST | `/v1/children/:childId/assessments/:assessmentId/finalise` | `child.assessment` | Finalise |

## Service Logic: createAssessment
1. Fetch child (`tenantId + deletedAt: null`); 404 if missing
2. `intakeComplete === false` → 422 `INTAKE_INCOMPLETE`
3. `consentStatus !== 'all_consented'` → 422 `CONSENT_REQUIRED`
4. Therapist: verify in `ChildTherapist` → 403 if not assigned (clinic_admin skips this check)
5. Inside transaction:
   - Existing draft? → 409 `DRAFT_EXISTS`
   - `MAX(version)` → `newVersion = max + 1` (or 1 if none)
   - Snapshot `medicalHistory`
   - `prisma.assessment.create(...)`
6. Return `{ id, version, status: 'draft' }`

## Error Codes
| Code | HTTP | Trigger |
|---|---|---|
| `INTAKE_INCOMPLETE` | 422 | `intakeComplete: false` on create |
| `CONSENT_REQUIRED` | 422 | `consentStatus !== 'all_consented'` on create |
| `DRAFT_EXISTS` | 409 | Second POST while draft exists |
| `ASSESSMENT_FINALISED` | 409 | PATCH or finalise on already-finalised |

## Tests
| Behavior | Expected |
|---|---|
| Assigned therapist creates assessment | 201, `{ version: 1, status: 'draft' }` |
| POST when `intakeComplete: false` | 422, `INTAKE_INCOMPLETE` |
| POST when `consentStatus !== 'all_consented'` | 422, `CONSENT_REQUIRED` |
| Unassigned therapist POST | 403 |
| Second POST while draft exists | 409, `DRAFT_EXISTS` |
| Finalise v1, create v2 | 201, `{ version: 2 }` |
| GET list returns all for assigned child | 200, array |
| Unassigned therapist GET | 403 |
| PATCH updates draft fields | 200, updated |
| PATCH on finalised | 409, `ASSESSMENT_FINALISED` |
| POST finalise | 200, `{ status: 'finalised' }` |
| clinic_admin reads all | 200 |
