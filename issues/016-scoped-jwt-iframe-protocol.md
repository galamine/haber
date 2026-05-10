# 016 — Scoped JWT & iframe postMessage Protocol [HITL]

**Type:** HITL — warrants design review before coding: the iframe/postMessage/JWT contract is the security boundary between the host app and game iframes. A mistake here could allow a game to read other students' data.  
**PRD User Stories:** 37–39, 44

## What to build

When a therapist launches a game session, the host app mints a scoped JWT specifically for that game iframe (scope: `session:write_results`, pinned to `session_id`, 15-minute expiry). The iframe receives the student context and the scoped JWT via a `LAUNCH` postMessage; the game responds with a `READY` postMessage to signal it is ready. The host starts the server-side session timer only after `READY` is received. Session completion requires explicit attendance confirmation.

**Design decisions to review before coding:**
- Whether the scoped JWT is issued by the same `AuthService` or a dedicated `ScopedTokenService` with its own signing key
- Which postMessage events form the canonical protocol (LAUNCH, READY, FORCE_STOP, GAME_RESULT) and their exact payload shapes
- How to sandbox the iframe (CSP, `sandbox` attribute allowlist) to prevent XSS escalation

## Acceptance criteria

**Schema / migrations**
- [ ] `Session.startedAt` (timestamp nullable) — set when `READY` is received from the game iframe
- [ ] `Session.scopedJwtIssuedAt` (timestamp nullable) — audit trail for scoped token issuance
- [ ] No new table for scoped JWTs — they are stateless signed tokens, not persisted; the `session_id` claim is the binding

**API endpoints**
- [ ] `POST /sessions/:id/start` — therapist only (must be assigned or claimed therapist for this session): validates session status is `scheduled`; mints a scoped JWT: `{ sub: userId, scope: 'session:write_results', session_id: sessionId, tenant_id: tenantId, exp: now + 15min }`; sets `Session.status: 'in_progress'`, `Session.scopedJwtIssuedAt: now()`; returns `{ scopedJwt, gameAssignments[] }`. Session timer (issue 017) starts when the client sends `READY` confirmation.
- [ ] `POST /sessions/:id/ready` — therapist only: called by the host app after the iframe fires `READY`; sets `Session.startedAt: now()`; triggers watchdog (issue 017) to begin countdown
- [ ] `GET /sessions/:id/game-config` — returns `{ gameId, gameVersionId, deployOrigin, level, durationSeconds }` for the current game assignment (used to build the iframe URL)
- [ ] `POST /sessions/:id/complete` — therapist only: marks session as `completed`; requires `attendanceStatus` in the body (`attended` | `absent`); cannot complete a session still `in_progress` without force-stop
- [ ] Scoped JWT validation middleware: separate from the main auth middleware; validates `scope === 'session:write_results'` AND `session_id` matches the URL param; used by game result endpoints (issue 018)

**Frontend**
- [ ] "Launch Game" button on session detail page → calls `POST /sessions/:id/start` → constructs iframe URL: `{deployOrigin}/game?game_id={gameId}&version={gameVersionId}&level={level}`
- [ ] Host app sends `LAUNCH` postMessage to the iframe immediately after load: `{ type: 'LAUNCH', studentName, studentAge, milesttoneTags: [], sessionId, scopedJwt }`
- [ ] Host app listens for `READY` from the iframe; on receipt calls `POST /sessions/:id/ready`
- [ ] On successful `READY`, session execution UI shows: game iframe (full-screen or large panel), live result feed panel, timer display, soft-warning toast (handled in issue 017)
- [ ] "Complete Session" button: opens attendance confirmation modal (`attended` / `absent`), therapist notes textarea, session quality tag dropdown, then calls `POST /sessions/:id/complete`
- [ ] `GameRuntimeBridge` module (`src/lib/GameRuntimeBridge.ts`): encapsulates all postMessage send/receive logic with typed event payloads

**Tests**
- [ ] `POST /sessions/:id/start` returns a JWT whose decoded payload has `scope: 'session:write_results'`, `session_id: sessionId`, and `exp` approximately 15 min from now
- [ ] The scoped JWT is rejected by the main auth middleware (wrong audience/scope)
- [ ] The main session JWT is rejected by the scoped JWT middleware
- [ ] `POST /sessions/:id/start` by a therapist not assigned to the session returns 403
- [ ] `POST /sessions/:id/complete` without `attendanceStatus` returns 422
- [ ] `LAUNCH` postMessage payload type matches the `GameRuntimeBridge` TypeScript interface
- [ ] `POST /sessions/:id/ready` sets `startedAt` and returns 200; calling it a second time returns 409 `SESSION_ALREADY_STARTED`

## QA / Manual testing

- [ ] Log in as therapist → open a session → click "Launch Game" → verify the iframe loads with correct URL params
- [ ] Open browser DevTools → Messages tab → confirm `LAUNCH` postMessage is sent to the iframe with `studentName`, `scopedJwt`, and `sessionId`
- [ ] Simulate `READY` from the iframe (e.g., via a test game stub that immediately posts `READY`) → verify `POST /sessions/:id/ready` is called and `startedAt` is set
- [ ] Decode the `scopedJwt` from the `LAUNCH` payload → verify `scope: 'session:write_results'` and `session_id` match
- [ ] Click "Complete Session" → select "Attended", add notes "Child was focused today", tag "Calm" → confirm → verify session status becomes "Completed" in the student session calendar

## Blocked by

- Issue 015 — Session Generation & Queue
