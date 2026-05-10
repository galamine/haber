# 015 — Session Generation & Queue [AFK]

**Type:** AFK  
**PRD User Stories:** 33–36, 46–48

## What to build

Pre-generate `Session` and `SessionGameAssignment` records for every student with an active treatment plan — either nightly (cron job) or immediately on plan activation. Therapists see "Today's Sessions" as a daily queue. Rooms can be booked in advance or claimed same-day. When a therapist is absent, their pre-assigned sessions become claimable by any available therapist on a first-come, first-served basis.

## Acceptance criteria

**Schema / migrations**
- [ ] `Session` model: `id`, `tenantId` (FK), `studentId` (FK), `treatmentPlanId` (FK), `scheduledDate` (date), `plannedStartTime` (time nullable), `startedAt` (timestamp nullable), `plannedEndTime` (timestamp nullable — computed as `startedAt + TreatmentPlan.sessionDurationMinutes`), `endedAt` (timestamp nullable), `status` enum (`scheduled` | `in_progress` | `completed` | `missed` | `cancelled`), `roomId` (nullable FK to SensoryRoom), `assignedTherapistId` (nullable FK to User), `claimedByTherapistId` (nullable FK to User), `attendanceStatus` enum (`attended` | `absent` | `pending`, default `pending`), `therapistNotes` (text nullable), `sessionQualityTag` enum (`distracted` | `calm` | `refused` | null), `createdAt`, `updatedAt`
- [ ] `SessionGameAssignment` model: `id`, `sessionId` (FK), `gameId` (FK), `gameVersionId` (FK — pinned from plan), `level` (nullable), `durationSeconds` (int), `repetitions` (int), `frequencyPerWeek` (int), `instructions` (text nullable), `scoringRubricRef` (text nullable), `orderIndex` (int), `createdAt`
- [ ] `RoomBooking` model: `id`, `roomId` (FK), `sessionId` (FK), `date` (date), `startTime` (time nullable), `endTime` (time nullable), `status` enum (`advance` | `same_day_claim`), `createdAt`; unique constraint on `(roomId, date, startTime)` to prevent double-booking

**API endpoints**
- [ ] `POST /internal/session-generator/run` — super_admin or cron token only: triggers session generation for all active plans; idempotent (skips already-generated sessions for the same date range); returns `{ generated: n, skipped: m }`
- [ ] `GET /sessions/today` — therapist: returns today's sessions assigned to or claimable by the caller; includes student summary, game assignment list, room assignment, status
- [ ] `GET /sessions?studentId=:id&dateFrom=:d&dateTo=:d` — doctor/clinic_admin: session calendar for a student
- [ ] `POST /sessions/:id/assign-room` — therapist/clinic_admin: book a room for a session; validates room is `active` (not maintenance) and not double-booked
- [ ] `POST /sessions/:id/claim` — any therapist: claim an unassigned (absent therapist's) session; first-claim wins; concurrent requests handled with row-level lock or optimistic concurrency; returns 409 `ALREADY_CLAIMED` if another therapist claimed it first
- [ ] `GET /sessions/:id` — session detail with game assignments, room, assigned/claimed therapist
- [ ] `POST /sessions/:id/mark-therapist-absent` — clinic_admin only: removes `assignedTherapistId`, making session claimable

**Frontend**
- [ ] "Today's Sessions" page (therapist home): card list sorted by planned start time; each card shows student name, age, room, game count, status badge; "Claim" button for unassigned sessions
- [ ] Session detail page: student header, game assignment list (with game name, version, duration, reps, instructions), room assignment widget (room picker or "claim idle room" button), therapist info
- [ ] Session calendar component on student detail page (week view, colour-coded by status)
- [ ] Room booking modal: date/time selector, room dropdown (shows only active rooms with no conflicting booking)

**Tests**
- [ ] `POST /internal/session-generator/run` with a 3x/week plan for 4 weeks → generates `3 * 4 = 12` sessions with correct `scheduledDate` values
- [ ] Generated sessions have `plannedEndTime = null` (not yet started — computed at session start in issue 016/017)
- [ ] `POST /sessions/:id/claim` by two concurrent therapists → exactly one succeeds (409 for the other)
- [ ] Room booking conflict: booking the same room at the same time returns 409 `ROOM_ALREADY_BOOKED`
- [ ] Running the generator twice for the same plan + date range → no duplicate sessions created (idempotent)
- [ ] Therapist A's session marked absent → session appears in "Today's Sessions" for Therapist B as claimable
- [ ] Session generation is tenant-scoped: sessions for Clinic A's plans are not generated for Clinic B

## QA / Manual testing

- [ ] Activate a treatment plan with frequency 3x/week for 4 weeks → trigger `POST /internal/session-generator/run` → verify 12 sessions appear in the student's session calendar
- [ ] Log in as therapist → navigate to "Today's Sessions" → verify today's session appears with the correct game assignments
- [ ] Click "Assign Room" → select an active room → save → verify the room name appears on the session card
- [ ] Log in as clinic_admin → mark the therapist as absent → log in as a second therapist → verify the session appears as "Claimable" → click "Claim" → verify it is now assigned to the second therapist
- [ ] Try to book the same room at the same time from two browser sessions simultaneously → verify only one succeeds

## Blocked by

- Issue 011 — Treatment Plan Builder & Lifecycle
- Issue 014 — Game Library Management
