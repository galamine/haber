# BE-12: Session Execution & Webhooks API

## Context

Therapists need to manage session lifecycle: assign rooms, mark absent, manually close, and launch externally-hosted games via webhook. When a game finishes, it calls back to the API to record results. BE-11 creates sessions; BE-13 creates the game catalog. This issue adds execution controls, webhook endpoints, and session queries.

**BE-11 and BE-13 must both be done first.**

## Files to Create

```
packages/api/src/schemas/session-execution.ts    — webhook body schemas + additional input schemas
```

## Files to Modify

```
apps/server/src/index.ts                        — add webhook routes
packages/api/src/routers/session.ts             — add execution procedures + session.get
packages/api/src/routers/index.ts               — ensure sessionRouter registered (from BE-11)
```

---

## Implementation Details

### Webhook Routes (plain Hono HTTP, added to `apps/server/src/index.ts`)

**`POST /api/sessions/:id/start`**:
- Read `webhook_secret` from body, compare to `session.webhookSecret`
- If mismatch → 401
- If session not `PENDING` → 409
- Update `status: "IN_PROGRESS"`, `startedAt: now()` → return `{ sessionId, startedAt }`

**`POST /api/sessions/:id/complete`**:
- Validate `webhook_secret`
- If `status = COMPLETED` and `webhookSecretUsed = true` → return existing `GameResult` (idempotent)
- Else: create `GameResult`, set `status: "COMPLETED"`, `completedAt: now()`, `webhookSecretUsed: true` → return result

### Additional tRPC Procedures in `session.ts`

| Procedure | Auth | Input | Notes |
|-----------|------|-------|-------|
| `get` | protected | `{ sessionId }` | Returns session with `gameAssignments` (include `gameVersion.game`) and `result` |
| `assignRoom` | protected | `{ sessionId, roomId }` | Creates `RoomBooking`; CONFLICT if room booked for date |
| `markAbsent` | protected | `{ sessionId }` | Only valid from `PENDING`; sets `status: ABSENT` |
| `manualClose` | protected | `{ sessionId, notes?, qualityTag? }` | Only valid from `PENDING` or `IN_PROGRESS` |
| `addNotes` | protected | `{ sessionId, notes, qualityTag? }` | Updates notes; any session status |
| `getWebhookUrl` | protected | `{ sessionId, gameId, gameVersion }` | Returns `{ gameId, version, sessionId, webhookSecret }` |
| `claimCoverage` | protected | `{ sessionId }` | Assigns therapist; CONFLICT if already assigned |
| `listUncovered` | protected | — | Returns today's `PENDING` sessions with `assignedTherapistId = null` |

### Schemas (add to `packages/api/src/schemas/session-execution.ts`)

```typescript
export const AssignRoomInput = z.object({ sessionId: z.string(), roomId: z.string() });
export const ManualCloseInput = z.object({ sessionId: z.string(), notes: z.string().optional(), qualityTag: z.enum(["CALM", "DISTRACTED", "REFUSED"]).optional() });
export const GetWebhookUrlInput = z.object({ sessionId: z.string(), gameId: z.string(), gameVersion: z.string() });
export const ClaimCoverageInput = z.object({ sessionId: z.string() });
export const WebhookStartBody = z.object({ webhook_secret: z.string() });
export const WebhookCompleteBody = z.object({
    webhook_secret: z.string(),
    scored: z.object({ score: z.number(), rubric_version: z.string() }),
    raw_metrics: z.record(z.unknown()),
    events: z.array(z.unknown()),
});
```

---

## Out of Scope

- Session generation — handled in BE-11
- Frontend UI — handled in FE-07

---

## Verification

1. `pnpm check-types` — must pass
2. `pnpm check` (Biome) — on new and edited files
3. `POST /api/sessions/:id/start` with wrong secret → 401; correct secret + PENDING → 200 + `status = IN_PROGRESS`
4. `POST /api/sessions/:id/complete` twice → second call returns same result without duplicate `GameResult`
5. `session.assignRoom` twice for same room/date → CONFLICT
6. `session.markAbsent` on non-PENDING → BAD_REQUEST
7. `session.claimCoverage` twice for same session → CONFLICT on second call
