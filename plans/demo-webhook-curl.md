# Demo: faking the game webhooks with curl

Two plain Hono routes (not tRPC) drive a therapy session from `PENDING` → `IN_PROGRESS` → `COMPLETED`. There's no HMAC/signature — auth is just a string match against `TherapySession.webhookSecret`. This lets you simulate a game finishing without a real game integration.

**Endpoints:** `apps/server/src/index.ts` (server on port 3000, `http://localhost:3000` by default per `apps/web/.env`'s `VITE_SERVER_URL`).
**Body schemas:** `packages/api/src/schemas/session-execution.ts` (`WebhookStartBody`, `WebhookCompleteBody`).

## 1. Get `<SESSION_ID>` and `<SECRET>`

Open the session detail page (`/sessions/$sessionId`) for a `PENDING` session as a logged-in therapist/staff user. The `session.get` tRPC response includes `id` and `webhookSecret` in plain text — read it from the page's data (e.g. React Query devtools, or inspect the network response).

**Caveat:** seed data from `packages/db/prisma/seed-flow.ts` only ships `COMPLETED` sessions — none are `PENDING`. To get a fresh `PENDING` session, create a plan for a child through the UI (sessions are auto-generated synchronously on plan create/activate, each with a fresh `webhookSecret`).

## 2. Start the session

Flips `PENDING` → `IN_PROGRESS`, sets `startedAt`.

```bash
curl -X POST http://localhost:3000/api/sessions/<SESSION_ID>/start \
  -H "Content-Type: application/json" \
  -d '{"webhook_secret": "<SECRET>"}'
```

Expected: `200 { sessionId, startedAt }`. `401` if the secret doesn't match, `409` if the session isn't `PENDING`, `404` if the session ID doesn't exist.

## 3. Complete the session

Flips `IN_PROGRESS` → `COMPLETED`, creates the `GameResult` row.

```bash
curl -X POST http://localhost:3000/api/sessions/<SESSION_ID>/complete \
  -H "Content-Type: application/json" \
  -d '{
    "webhook_secret": "<SECRET>",
    "scored": { "score": 87, "rubric_version": "v1" },
    "raw_metrics": { "total_attempts": 20, "successful_attempts": 17, "avg_response_time_ms": 1350 },
    "events": [
      { "t": 0, "event": "session_start" },
      { "t": 600, "event": "session_end" }
    ]
  }'
```

Expected: `200` with the created `GameResult`. `scored.score` and `scored.rubric_version` are required — the session detail page's result card only reads those two keys, so leaving them out (or using a different shape) will render as blank/undefined even though the DB column is a free-form `Json` blob. `raw_metrics` and `events` accept anything.

This endpoint is idempotent: calling it again after the session is already `COMPLETED` (with `webhookSecretUsed: true`) returns the existing `GameResult` unchanged instead of creating a duplicate.

## 4. Watch it update

The session detail page polls `session.get` every 5 seconds while `status === "IN_PROGRESS"`. No manual refresh needed — the page will reflect `COMPLETED` + the score within 5s of the `/complete` call.
