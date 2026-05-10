# 017 — Session Watchdog [AFK]

**Type:** AFK  
**PRD User Stories:** 40–43

## What to build

The server-side session watchdog enforces the treatment plan's `sessionDurationMinutes` cap. After `POST /sessions/:id/ready` sets `startedAt`, the watchdog computes `planned_end_time = startedAt + sessionDurationMinutes`. At 90% of the cap, a soft warning is sent. At 100%, `FORCE_STOP` is sent to the host, the game gets a 5-second grace period to write a partial result, then the iframe is destroyed. The client timer is a backup — the server is the source of truth.

## Acceptance criteria

**Schema / migrations**
- [ ] `Session.plannedEndTime` (timestamp nullable) — computed and stored when `POST /sessions/:id/ready` is received: `startedAt + sessionDurationMinutes * 60 seconds`
- [ ] `Session.softWarningSentAt` (timestamp nullable) — audit trail for when the 90%-cap warning was fired
- [ ] `Session.forceStoppedAt` (timestamp nullable) — audit trail for when force-stop was executed
- [ ] `Session.forceStopReason` (text nullable — e.g. `"planned_end_time_reached"`)

**API endpoints**
- [ ] `GET /sessions/:id/timer-status` — returns `{ startedAt, plannedEndTime, elapsedSeconds, remainingSeconds, softWarningFired: bool, forceStopFired: bool }` — polled by the client as backup timer; therapist clients should poll every 10 seconds
- [ ] `POST /sessions/:id/force-stop` — internal (called by the watchdog server-side OR by the client as a fallback): sets `Session.forceStoppedAt`, sends `FORCE_STOP` postMessage to iframe via server-side event or WebSocket push, sets `Session.status: 'completed'` after 5-second grace window; idempotent

**Backend watchdog implementation**
- [ ] `SessionWatchdog` service: on `POST /sessions/:id/ready`, schedules two timers: (a) 90%-of-cap timer → sets `softWarningSentAt`, emits `SOFT_WARNING` event; (b) 100%-of-cap timer → calls `POST /sessions/:id/force-stop` logic
- [ ] Timers are in-process (Node.js `setTimeout`) for V1; if the server restarts mid-session, the client's polling of `GET /sessions/:id/timer-status` detects `plannedEndTime` has passed and triggers the fallback `POST /sessions/:id/force-stop`
- [ ] The two timers are cancelled if `POST /sessions/:id/complete` is called before the watchdog fires

**Frontend**
- [ ] Session execution UI: countdown timer component shows `remaining time` read from `GET /sessions/:id/timer-status` (polled every 10s)
- [ ] At 90% of cap (e.g., minute 54 of a 60-min session): amber toast notification: "9 minutes remaining — please start wrapping up"
- [ ] When `FORCE_STOP` arrives (via postMessage from the host's watchdog logic): red banner "Session time limit reached"; host posts `FORCE_STOP` to the iframe and starts 5-second countdown
- [ ] After 5 seconds: iframe is destroyed (`src` set to `about:blank`); session UI transitions to "Session Ended" state with partial result indicator
- [ ] Client-side fallback: if `GET /sessions/:id/timer-status` shows `remainingSeconds <= 0` and `forceStopFired: false`, the client initiates `POST /sessions/:id/force-stop` as fallback

**Tests**
- [ ] `POST /sessions/:id/ready` sets `Session.plannedEndTime = startedAt + sessionDurationMinutes * 60s`
- [ ] Watchdog fires `SOFT_WARNING` at `0.9 * sessionDurationMinutes` elapsed (not before, not after)
- [ ] Watchdog fires `FORCE_STOP` at exactly `sessionDurationMinutes` elapsed
- [ ] `POST /sessions/:id/complete` before watchdog fires → both timers are cancelled → no spurious `FORCE_STOP`
- [ ] `POST /sessions/:id/force-stop` is idempotent — calling it twice does not double-update `forceStoppedAt`
- [ ] `GET /sessions/:id/timer-status` for a session where `plannedEndTime` is in the past returns `remainingSeconds: 0`, `forceStopFired: true`

## QA / Manual testing

- [ ] Start a game session (issue 016) → in the session timer config, temporarily set plan session duration to 2 minutes → verify the countdown timer shows ~2 minutes remaining
- [ ] Wait 108 seconds (90% of 120s) → verify the amber "wrapping up" toast appears
- [ ] Wait the remaining 12 seconds → verify the red "Session time limit reached" banner appears and the iframe is destroyed after 5 seconds
- [ ] Check the session record in the database → verify `softWarningSentAt`, `forceStoppedAt`, and `plannedEndTime` are all set correctly
- [ ] Run another session and click "Complete Session" before the timer expires → verify no FORCE_STOP is triggered

## Blocked by

- Issue 016 — Scoped JWT & iframe postMessage Protocol
