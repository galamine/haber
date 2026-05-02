# 12-game-result-ingestion

## What to build

Game result ingestion API: accepts scored results from game iframes via `POST /v1/sessions/:id/results`, with idempotency key (UUID), append-only semantics, partial flag support, score locked to rubric version.

## Acceptance criteria

- [ ] `POST /v1/sessions/:id/results` — accepts game result with idempotency (requires `Idempotency-Key` header, UUID)
- [ ] Duplicate Idempotency-Key returns 200 with stored response (no re-processing)
- [ ] Append-only: multiple results per session allowed (game restart scenarios)
- [ ] Last-write-wins for edits (no version history on individual results)
- [ ] Result payload: `{ scored: { score, rubric_version }, raw_metrics: {}, events: [], partial: boolean }`
- [ ] `scored.rubric_version` stored with result — historical scores locked to rubric version at session time
- [ ] `GameResultService` with idempotency check, partial flag handling, append semantics
- [ ] Real-time update: therapist sees game results appear live on session screen as POST returns
- [ ] Prisma: GameResult model with session_id, scored JSON, raw_metrics JSON, events JSON, partial boolean
- [ ] Frontend: session screen shows live-updating results list as POSTs return
- [ ] Integration tests: idempotency (duplicate key returns stored), partial flag, append semantics, rubric version locking
- [ ] Super Admin dashboard: game-runtime health (result-write success/failure rates, latency, error rates per game)

## Blocked by

- [11-game-runtime-iframe-bridge.md](./11-game-runtime-iframe-bridge.md)

## User stories

- #49: Game runtime (iframe) POST /api/v1/sessions/{session_id}/results with idempotency key
- #50: Backend accepts multiple results per session (append-only, last-write-wins for edits)
- #51: Backend stores scored.score, scored.rubric_version, raw_metrics, events[] with result
- #52: Super Admin sees game-runtime health dashboard (result-write success/failure rates, latency, error rates per game)
- #84: Therapist sees game results appear live on session screen as POST returns
- #87: Session screen shows partial results inline with `partial: true` flag when time ran out mid-game

## QA checklist

- [ ] Idempotency key required, missing returns 400
- [ ] Duplicate key returns same response without re-processing
- [ ] Multiple results for same session are all stored (append)
- [ ] Score is immutable once stored (rubric version locked)
- [ ] Partial results show `partial: true` flag on session screen
- [ ] Game runtime health dashboard shows per-game metrics
- [ ] Failed result writes show error count and sample errors