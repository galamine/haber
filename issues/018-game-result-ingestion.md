# 018 — Game Result Ingestion [AFK]

**Type:** AFK  
**PRD User Stories:** 49–52

## What to build

Games POST their results to the host API using the scoped JWT issued at session start. Results are append-only (multiple results per session, last-write-wins for edits). Each result carries the score, rubric version, raw metrics, and an events array — all locked to the rubric version at the time of the session (historical scores are never recomputed). Results written with `partial: true` indicate the game was force-stopped mid-run. A Super Admin dashboard shows game runtime health metrics.

## Acceptance criteria

**Schema / migrations**
- [ ] `GameResult` model: `id`, `sessionId` (FK), `sessionGameAssignmentId` (FK), `tenantId` (FK), `idempotencyKey` (string, unique per session — prevents duplicate writes on retry), `score` (decimal nullable), `rubricVersion` (string — locked at write time), `rawMetrics` (JSONB nullable — arbitrary game-specific metrics), `events` (JSONB array of `{ type, timestamp, data }` nullable), `partial` (boolean default false), `createdAt`
- [ ] Index on `GameResult(idempotencyKey)` for fast idempotency check
- [ ] Index on `GameResult(sessionId, sessionGameAssignmentId)` for per-game-per-session queries

**API endpoints**
- [ ] `POST /sessions/:sessionId/results` — authenticated with the **scoped JWT** (not the main JWT): `{ sessionGameAssignmentId, idempotencyKey, score, rubricVersion, rawMetrics, events, partial }`; validates: `scope === 'session:write_results'`, `session_id` claim matches `:sessionId`, `idempotencyKey` is unique for this session (returns 200 with stored result if duplicate key); appends result (does not overwrite); returns `{ id, partial, createdAt }`
- [ ] `GET /sessions/:sessionId/results` — therapist/doctor: list all results for a session, including partial ones with `partial: true` flag
- [ ] `GET /sessions/:sessionId/results/:resultId` — result detail
- [ ] The main JWT cannot access this endpoint (wrong scope — returns 403 `INSUFFICIENT_SCOPE`)
- [ ] `GET /super-admin/game-health` — super_admin only: per-game aggregations: `{ gameId, totalResults, partialResults, successRate, avgLatencyMs, recentErrors[] }` (latency measured from request receipt to DB write)

**Frontend**
- [ ] Live result feed panel on the session execution screen: updates every 10 seconds (polling `GET /sessions/:sessionId/results`); shows each result as a card with score, timestamp, partial badge if `partial: true`
- [ ] Partial result card: amber "Partial — session ended mid-game" badge with the last captured score
- [ ] Super Admin game health dashboard (after issue 023 adds the platform dashboard): table of games with success rate bar, avg latency, recent error log — accessible from Super Admin nav

**Tests**
- [ ] `POST /sessions/:sessionId/results` with scoped JWT → result created with correct `sessionId` and `rubricVersion`
- [ ] Same request with same `idempotencyKey` → returns 200 with the original stored result (no second row created)
- [ ] `POST /sessions/:sessionId/results` with main session JWT (not scoped) → returns 403 `INSUFFICIENT_SCOPE`
- [ ] Two different results (different `sessionGameAssignmentId`) for the same session → both appended; `GET /sessions/:sessionId/results` returns 2 rows
- [ ] Result with `partial: true` → `partial` field persisted correctly
- [ ] `GET /sessions/:sessionId/results` from a therapist in a different clinic → returns 403 (tenant isolation)

## QA / Manual testing

- [ ] Using a test game stub (or curl with the scoped JWT), POST a result to `/sessions/:sessionId/results` with a valid idempotency key → verify it appears in the live result feed panel on the session execution screen
- [ ] POST the same request again with the same `idempotency_key` → verify no duplicate row appears; the response is 200 with the original result
- [ ] POST a result with `partial: true` → verify it shows an amber "Partial" badge in the result feed
- [ ] Try POSTing a result using the main session JWT → verify 403 is returned
- [ ] Log in as super_admin → navigate to Game Health dashboard → verify success rates and latency are visible per game

## Blocked by

- Issue 016 — Scoped JWT & iframe postMessage Protocol
