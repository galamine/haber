# 11-game-runtime-iframe-bridge

## What to build

Game runtime bridge: loads game iframe with session context (student name, age, milestone tags) via postMessage LAUNCH→READY handshake, scoped JWT for game-to-API authentication (session:write_results scope, pinned to session_id, 15-min expiry), server-side session watchdog with 20-min FORCE_STOP and 5s grace period for partial results.

## Acceptance criteria

- [ ] GameRuntimeBridge: handles postMessage protocol
  - Host sends `LAUNCH` message: `{ session_id, student_name, student_age, milestone_tags[], scoped_jwt, game_config: { game_id, version, level } }`
  - Game responds with `READY` message: `{ game_id, version, status: 'ready' }`
  - Host records `session.started_at` only after READY received
- [ ] `GET /v1/sessions/:id/scoped-token` — mints scoped JWT: `sub: user_id`, `scope: session:write_results`, `session_id: session_id`, `exp: now + 15min`
- [ ] ScopedTokenService: token scoped to session_id, cannot be used for other students
- [ ] SessionWatchdog: server-side timer, records `session.started_at` on READY, sends `FORCE_STOP` push at 20 min
- [ ] Host polls or receives push at 18-min mark to show soft warning UI
- [ ] `FORCE_STOP` message sent to game iframe at 20 min
- [ ] Game has 5-second grace period to `POST /v1/sessions/:id/results` with `partial: true` before iframe destroyed
- [ ] Partial result handling: session screen shows results with `partial: true` flag
- [ ] Prisma: Session with `started_at`, `planned_end_time`, `actual_end_time`; GameResult with `partial` flag
- [ ] Frontend: Session runner page with iframe container, 18-min warning toast, 20-min countdown, FORCE_STOP handler
- [ ] Integration tests: scoped token scope validation, SESSION_START on READY, FORCE_STOP at 20 min, partial flag on force-stop results