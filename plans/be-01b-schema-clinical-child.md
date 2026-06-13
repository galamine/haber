# Plan: BE-01b — Clinical & Child Domain Schema

## Context

This issue adds the clinical and child domain Prisma models that unlock child intake, consent, assessment, and sensory profile features. It is blocked by BE-01a (Clinic + User with clinicId/role), which is already complete — `clinic.prisma`, `department.prisma`, `sensory_room.prisma`, and the updated `auth.prisma` exist as untracked/modified files on the working tree.

The task is to create `packages/db/prisma/schema/clinical.prisma`, run a formal migration, regenerate the Prisma client, and verify types pass.

## Decisions

| Question | Decision |
|---|---|
| `FollowUpAssessment` not defined in issue | Skip — omit `Child.followUps`, `InitialAssessment.followUps`, and `SensoryProfile.followUpId` |
| ID generation | Use `cuid()` (consistent with existing clinic/auth/session models) |
| `SensoryProfile` FKs | Add proper `@relation` wiring `assessmentId → InitialAssessment` |
| `Guardian.userId` | Keep as plain `String?` (no `@relation` — loose ref to User with `loginEnabled=false`) |

## Steps

### 1 — Create `packages/db/prisma/schema/clinical.prisma`

Single new file. No existing files are modified.

Adjustments vs. issue spec:
- `@id @default(cuid())` on all models (not `uuid()`)
- `@@map(snake_case_name)` on every model (matches existing convention)
- `Child.followUps FollowUpAssessment[]` removed
- `InitialAssessment.followUps FollowUpAssessment[]` removed
- `SensoryProfile.followUpId String?` removed
- `SensoryProfile.assessment InitialAssessment? @relation(...)` added; back-relation `sensoryProfiles SensoryProfile[]` already on `InitialAssessment`
- No inline comments (per style guide)

**Enums:** `ConsentStatus`, `ConsentType`

**Models:** `Child`, `Guardian`, `ConsentRecord`, `InitialAssessment`, `SensoryProfile`, `Milestone`, `Diagnosis`, `FunctionalConcern`, `AssessmentTool`, `Equipment`, `InterventionApproach`, `SensorySystem`, `ChildTherapistAssignment`

### 2 — Run migration

```bash
pnpm db:migrate -- --name clinical_child_domain
```

Creates a timestamped migration file under `packages/db/prisma/migrations/` and applies it to the database. Also regenerates the Prisma client automatically.

> Note: If BE-01a schema was applied with `db:push` (no prior migration file), Prisma will include all pending BE-01a tables in this migration. That is expected.

### 3 — Verify types

```bash
pnpm check-types
```

Must exit 0.

## Files

- **Create:** `packages/db/prisma/schema/clinical.prisma`
- **Auto-generated:** `packages/db/prisma/generated/` (never edit manually)
- **Auto-created:** `packages/db/prisma/migrations/<timestamp>_clinical_child_domain/migration.sql`

## Verification

1. `pnpm db:migrate` exits 0 and prints "Your database is now in sync with your schema"
2. All listed tables exist in the database
3. `pnpm check-types` exits 0
4. Migration SQL file committed
