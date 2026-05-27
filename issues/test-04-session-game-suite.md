# TEST-04: Session Generation, Execution & Game Result Test Suite

## What to build

Integration tests for `SessionGenerator`, `GameResultService`, and `TreatmentPlanService` — covering the most complex business logic in the backend.

**Packages:** `packages/api` (Vitest integration tests)

### Test file locations

```
packages/api/src/__tests__/session-generator.test.ts
packages/api/src/__tests__/game-result.test.ts
packages/api/src/__tests__/treatment-plan.test.ts
```

### SessionGenerator tests (`session-generator.test.ts`)

```
describe("Session generation on activation")
  - 4-week plan with frequencyPerWeek=3 generates 12 sessions on weekdays
  - All generated sessions have status=PENDING
  - All sessions have unique webhookSecret values
  - Each session has pre-linked SessionGameAssignment rows

describe("Session regeneration on plan modification")
  - Modifying a plan regenerates only PENDING future sessions
  - Sessions with status IN_PROGRESS, COMPLETED, ABSENT, MANUALLY_CLOSED are NOT deleted
  - New sessions are created for the new plan version from today forward
  - Old plan's future PENDING sessions are deleted
```

### GameResultService tests (`game-result.test.ts`)

```
describe("Webhook authentication")
  - POST /api/sessions/:id/start with wrong webhook_secret returns 401
  - POST /api/sessions/:id/complete with wrong webhook_secret returns 401

describe("Result persistence")
  - POST /api/sessions/:id/complete stores scored, raw_metrics, events correctly
  - Session status transitions to COMPLETED after complete webhook
  - webhookSecretUsed is set to true after complete webhook

describe("Idempotency")
  - Duplicate POST /api/sessions/:id/complete returns 200 with the same GameResult
  - No duplicate GameResult rows created on repeated calls
  - Duplicate call does not change session status or completedAt
```

### TreatmentPlanService tests (`treatment-plan.test.ts`)

```
describe("Plan versioning")
  - plan.modify increments versionNumber on the new plan row
  - plan.modify sets parentPlanId to the previous version's id
  - After modification, only the new version has isActive=true
  - After modification, old version has isActive=false

describe("Game version pinning")
  - Adding a game to a plan pins to the specific gameVersionId
  - Creating a new game version does not change the pinned version in the plan

describe("Preset clone")
  - plan.create with presetId clones preset data into the plan
  - sourcePresetId is set on the cloned plan
  - The cloned plan is immediately editable (no link back to preset)
  - Editing the cloned plan does not affect the preset data
```

## Acceptance criteria

- [ ] All described test cases pass on a real test database
- [ ] Session count correctness is verified for various frequencyPerWeek values
- [ ] Idempotency: 10 repeated webhook calls produce exactly 1 GameResult row
- [ ] Plan versioning: correct `parentPlanId` chain and `isActive` exclusivity
- [ ] `pnpm --filter api test` passes

## Blocked by

- BE-12 (Session execution and webhooks must be implemented)
