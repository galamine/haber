# Plan: Flow Seed Script (`seed-flow.ts`)

## Context

Testing the full clinical workflow — intake → initial assessment → treatment plan → therapy sessions → follow-up assessment → plan revision — requires more than the dev seed (users only) and the clinical seed (taxonomy reference data only). This script creates a complete, end-to-end scenario with two distinct children covering every model in the flow.

## What gets created

### Entities

| Entity | Count | Notes |
|---|---|---|
| Clinic | 1 | "Sunshine Children's OT Clinic", Chennai |
| Staff (intake) | 1 | `staff.flow@seed.local` |
| Therapists | 2 | `therapist.priya@seed.local`, `therapist.ravi@seed.local` |
| Children | 2 | Distinct diagnoses, presets, ages |
| Guardians | 2 | One per child |
| ConsentRecords | 6 | 3 types × 2 children |
| InitialAssessments | 2 | One per child |
| SensoryProfiles (initial) | 14 | 7 systems × 2 children |
| TreatmentPlans | 2 | Seeded as ACTIVE |
| Goals | 8 | 4 per plan (2 short-term + 2 long-term) |
| Games + GameVersions | 4 | 2 per child (distinct categories) |
| PlanGameAssignments | 4 | 2 per plan |
| ChildTherapistAssignments | 2 | One per child |
| TherapySessions | 8 | 4 per child (COMPLETED) |
| SessionGameAssignments | 8 | 1 per session |
| GameResults | 8 | 1 per session |
| FollowUpAssessments | 2 | One per child |
| SensoryProfiles (follow-up) | 14 | 7 systems × 2 children (updated ratings) |
| GoalProgressEntries | 8 | 4 per follow-up (per goal) |
| Plan revision | 1 | Child 1 only: new plan, `parentPlanId` → original, `versionNumber: 2` |

### Child profiles

**Child 1 — Aarav Sharma, male, DOB 2020-03-15 (≈5 y)**
- Diagnoses: ASD + SPD → draws from `preset_asd_sensory`
- Therapist: Priya
- Sessions: 4 × COMPLETED, Sensory Integration + Balance games
- Follow-up: sensory ratings improve (tactile 5→4, vestibular 4→3)
- Plan revision: v2 created post-follow-up

**Child 2 — Meera Pillai, female, DOB 2017-08-22 (≈8 y)**
- Diagnoses: DCD + Dyspraxia → draws from `preset_dcd_dyspraxia`
- Therapist: Ravi
- Sessions: 4 × COMPLETED, Fine Motor + Coordination games
- Follow-up: motor scores improve, one short-term goal met

### Games created (global)

| ID | Name | Category |
|---|---|---|
| `sf_game_bubble` | Bubble Burst Sensory | gc_sensory_integration |
| `sf_game_balance` | Balance Board Reach | gc_balance |
| `sf_game_trace` | Precision Trace | gc_fine_motor |
| `sf_game_catch` | Catch & Release | gc_coordination |

## File to create

`packages/db/prisma/seed-flow.ts`

Pattern follows `seed-dev.ts`: top-level `await`, `upsert` with deterministic `sf_`-prefixed IDs, `prisma.$disconnect()` at end.

## Script to add to `packages/db/package.json`

```json
"seed:flow": "cross-env DOTENV_CONFIG_PATH=../../apps/server/.env tsx prisma/seed-flow.ts"
```

## Execution order

```bash
pnpm --filter @haber-final/db seed:dev        # clinic + users (already done)
pnpm --filter @haber-final/db seed:clinical   # taxonomy reference data (already done)
pnpm --filter @haber-final/db seed:flow       # full flow scenario
```

## Verification

After running, check in Prisma Studio (`pnpm db:studio`):
1. Log in as `therapist.priya@seed.local` → see Aarav in assigned children
2. Aarav profile → Initial Assessment filled, Treatment Plan ACTIVE with 4 goals
3. Sessions → 4 COMPLETED with game results
4. Follow-up → sensory deltas visible, goal progress entries present
5. Plan v2 linked to v1 via `parentPlanId`
6. Repeat for Meera / Ravi
