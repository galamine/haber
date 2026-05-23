# BE-12: Session Execution & Game Webhooks API

## What to build

Implement session execution controls (room assignment, absent marking, manual close, quality tagging) and the two game webhook endpoints that the externally-hosted game calls back to.

**Packages:** `packages/api`, `packages/shared`

### Webhook endpoints (plain Hono HTTP — NOT tRPC)

Add to `packages/api/src/index.ts`:

```
POST /api/sessions/:id/start
  Body: { webhook_secret: string }
  — Validates webhook_secret matches TherapySession.webhookSecret
  — Sets session.status = IN_PROGRESS, session.startedAt = now()
  — Returns 200 with { sessionId, startedAt }
  — Returns 409 if already started

POST /api/sessions/:id/complete
  Body: {
    webhook_secret: string,
    scored: { score: number, rubric_version: string },
    raw_metrics: Record<string, unknown>,
    events: unknown[]
  }
  — Validates webhook_secret
  — Idempotent: if session already COMPLETED, return stored GameResult without error
  — Creates GameResult record, sets session.status = COMPLETED, session.completedAt = now()
  — Marks session.webhookSecretUsed = true
  — Returns 200 with stored GameResult
```

### tRPC procedures

Add to `packages/api/src/router/session.ts`:

```
session.assignRoom     (assigned therapist) → TherapySession
  input: { sessionId, roomId }
  — Creates RoomBooking; returns CONFLICT if room already booked for that date

session.markAbsent     (assigned therapist) → TherapySession
  input: { sessionId }
  — Sets status = ABSENT; only valid if status = PENDING

session.manualClose    (assigned therapist) → TherapySession
  input: { sessionId, notes?, qualityTag? }
  — Sets status = MANUALLY_CLOSED; only valid if status = IN_PROGRESS or PENDING

session.addNotes       (assigned therapist) → TherapySession
  input: { sessionId, notes, qualityTag? }

session.getWebhookUrl  (assigned therapist) → { startUrl, completeUrl, params }
  input: { sessionId, gameId, gameVersion }
  — Returns the game URL parameters: { game_id, version, session_id, webhook_secret }
  — Used by the "Open Game" button in the UI to construct the launch URL

session.claimCoverage  (protected therapist) → TherapySession
  input: { sessionId }
  — First-claim-wins: assigns calling therapist to an uncovered session
  — Returns CONFLICT if already claimed

session.listUncovered  (protected therapist) → TherapySession[]
  — Returns PENDING sessions today where assignedTherapistId's user is absent/unassigned
```

### Authorization

- Webhook endpoints authenticate via `webhook_secret` in the body — no JWT required
- Webhook `complete` endpoint: if `webhookSecretUsed = true` on the session, still return the stored result (idempotency)

### Shared schemas

Add:
- `WebhookStartBody`, `WebhookCompleteBody`, `GameResultSchema`
- `AssignRoomInput`, `ManualCloseInput`

## Acceptance criteria

- [ ] `POST /api/sessions/:id/start` with correct `webhook_secret` sets `startedAt` and `status = IN_PROGRESS`
- [ ] `POST /api/sessions/:id/start` with wrong `webhook_secret` returns 401
- [ ] `POST /api/sessions/:id/complete` creates `GameResult` with `scored`, `rawMetrics`, `events` persisted
- [ ] Duplicate `POST /api/sessions/:id/complete` (same sessionId) returns 200 with stored result without creating a duplicate `GameResult`
- [ ] `session.assignRoom` creates a `RoomBooking`; second call for the same room and date returns `CONFLICT`
- [ ] `session.markAbsent` only transitions from `PENDING`; calling on `COMPLETED` returns `BAD_REQUEST`
- [ ] `session.manualClose` closes the session regardless of game webhook state
- [ ] `session.claimCoverage` assigns the therapist; a second call by a different therapist returns `CONFLICT`
- [ ] `pnpm typecheck` passes

## Blocked by

- BE-11 (sessions must exist to execute them)
- BE-13 (game must exist to look up game_id for webhook URL)
