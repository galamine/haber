# 10-session-runner-room-booking

## What to build

Session execution UI: therapist sees "Today's Sessions" with room assignment and student summary, claims sessions, launches games in iframe with postMessage handshake, marks attendance (attended/absent), attaches notes and quality tags. Room booking with optional advance booking and same-day idle claim.

## Acceptance criteria

- [ ] `GET /v1/sessions/today` — returns today's sessions for current therapist (status=scheduled, room assignment, student summary, pre-linked game assignments)
- [ ] `POST /v1/sessions/:id/claim` — therapist claims a scheduled session (first-claim first-served, prevents race condition mid-session)
- [ ] `POST /v1/sessions/:id/start` — therapist starts session, triggers SESSION_START event for watchdog
- [ ] `POST /v1/sessions/:id/complete` — mark session complete with attendance (attended/absent), notes, optional quality tag (distracted/calm/refused)
- [ ] Room management: `POST /v1/rooms` (create room with name/code, optional department, equipment list, status), `GET /v1/rooms`, `PATCH /v1/rooms/:id`, `POST /v1/rooms/:id/book` (advance booking)
- [ ] `POST /v1/rooms/:id/claim` — same-day claim of idle room
- [ ] Unclaimed sessions from absent therapist become available for other therapists to claim
- [ ] Session queue shows all therapists' claimed sessions without stealing
- [ ] Prisma: Room model with department relation, Session with room_id and assigned_therapist_id
- [ ] Frontend: "Today's Sessions" page with session cards (student name, room, game list), claim button, start/complete flow, room booking panel
- [ ] Integration tests: claim is atomic (first-claim wins), absent therapist's sessions become available

## Blocked by

- [09-session-generation-queue.md](./09-session-generation-queue.md)

## User stories

- #34: Therapist sees "Today's Sessions" — list of sessions scheduled for today with room assignment and student summary
- #35: Therapist sees pre-linked game assignments on session (game ID, version, level, duration, reps, instructions, scoring rubric reference)
- #36: Therapist assigns a specific room to a session
- #44: Therapist marks session complete only after explicitly confirming attendance (attended/absent)
- #45: Therapist attaches notes and optionally tags session quality (distracted, calm, refused) when completing a session
- #46: Rooms support optional advance booking but allow same-day claim of idle rooms
- #47: When therapist is absent, their pre-assigned sessions show as available to any free therapist (first-claim first-served)
- #48: Therapist sees their claimed sessions and does not lose them to others once claimed (no race condition mid-session)
- #81 (session launch): therapist launches game in iframe, server-side timer starts after READY postMessage

## QA checklist

- [ ] "Today's Sessions" shows only sessions for the logged-in therapist
- [ ] Claim button is disabled for already-claimed sessions
- [ ] Start button triggers SESSION_START event
- [ ] Complete form requires attendance selection before submission
- [ ] Quality tags are optional but selectable
- [ ] Room advance booking creates reservation that blocks other claims
- [ ] Same-day idle room claim works for unbooked rooms
- [ ] Absent therapist's sessions become claimable by others
- [ ] Game launch sends LAUNCH postMessage with correct session context