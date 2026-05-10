# 021 — Notifications & Alerts [AFK]

**Type:** AFK  
**PRD User Stories:** 62–64

## What to build

Event-driven notification system: when sessions are created or modified, 24h and 1h reminder jobs are enqueued; these jobs are cancelled if the session changes or is cancelled. Notifications are delivered via email and shown in-app. SMS/WhatsApp is behind a feature flag. Notification events include: account invite, OTP, session reminders, missed sessions, plan expiring in 7 days, plan expired, plan closed, and game result-write failure threshold.

## Acceptance criteria

**Schema / migrations**
- [ ] `Notification` model: `id`, `tenantId` (FK nullable), `recipientUserId` (FK), `type` enum (all event types listed below), `channel` enum (`email` | `in_app` | `sms`), `subject` (text), `body` (text), `status` enum (`pending` | `sent` | `failed` | `read`), `scheduledAt` (timestamp nullable — for deferred jobs), `sentAt` (timestamp nullable), `readAt` (timestamp nullable), `metadata` (JSONB — e.g. `{ sessionId, planId }`), `createdAt`
- [ ] `NotificationJob` model: `id`, `notificationId` (FK), `jobType` enum (`24h_reminder` | `1h_reminder`), `sessionId` (FK nullable), `scheduledAt` (timestamp), `cancelledAt` (timestamp nullable), `executedAt` (timestamp nullable)
- [ ] Notification types: `account_invite`, `otp_login`, `session_reminder_24h`, `session_reminder_1h`, `session_missed`, `plan_expiring_7d`, `plan_expired`, `plan_closed`, `game_result_failure_threshold`

**API endpoints**
- [ ] `GET /notifications` — current user: paginated list of in-app notifications, newest first; supports `status=unread` filter
- [ ] `POST /notifications/:id/read` — mark a notification as read
- [ ] `POST /notifications/read-all` — mark all unread notifications as read
- [ ] `GET /notifications/unread-count` — returns `{ count: n }` — polled every 30s by the frontend

**Backend notification jobs**
- [ ] `NotificationService.enqueue24hReminder(sessionId)` — schedules a `NotificationJob` to fire at `session.scheduledDate - 24h`; sends to assigned therapist and clinic admin
- [ ] `NotificationService.enqueue1hReminder(sessionId)` — schedules at `session.plannedStartTime - 1h`
- [ ] Both jobs are cancelled (set `cancelledAt`) when `Session.scheduledDate` or `Session.assignedTherapistId` changes, or when the session is cancelled
- [ ] `NotificationService.sendMissedSession(sessionId)` — triggered if session is still `scheduled` at end of day; sends to assigned doctor and clinic admin
- [ ] `NotificationService.checkPlanExpiry()` — nightly cron: finds plans with `projectedEndDate` within 7 days → sends `plan_expiring_7d`; on expiry date sends `plan_expired`
- [ ] `NotificationService.alertGameResultFailure(gameId, failureRate)` — triggered when `GameResult` write failure rate for a game exceeds threshold (configurable, default 10%); sends to super_admin
- [ ] Email delivery via existing `EmailService` (Nodemailer); SMS delivery via a stub interface behind `feature_flags.sms_notifications` feature flag
- [ ] All notification sends are fire-and-forget; failures are logged but do not block the primary operation

**Frontend**
- [ ] Notification bell icon in the header: shows unread count badge; polls `GET /notifications/unread-count` every 30s
- [ ] Notification dropdown panel: list of recent notifications with icon, subject, relative time, unread dot; "Mark all read" button
- [ ] Clicking a notification navigates to the relevant entity (e.g., session detail, plan page) and marks it read

**Tests**
- [ ] Creating a session enqueues both a 24h and a 1h reminder job
- [ ] Modifying `session.scheduledDate` cancels old reminder jobs and enqueues new ones with the updated times
- [ ] Cancelling a session cancels both reminder jobs
- [ ] Plan with `projectedEndDate` 6 days from now → nightly check fires `plan_expiring_7d` notification
- [ ] `GET /notifications` returns notifications scoped to the caller's `userId` (not other users)
- [ ] SMS notification is not attempted when `feature_flags.sms_notifications: false`

## QA / Manual testing

- [ ] Create a session scheduled for tomorrow → check the `NotificationJob` table in the database → verify a 24h reminder job exists with the correct `scheduledAt`
- [ ] Change the session date to the day after tomorrow → verify the old job's `cancelledAt` is set and new jobs are created
- [ ] Manually trigger the 24h reminder job → verify you receive an email at the therapist's email address
- [ ] Log in as therapist → click the notification bell → verify the session reminder notification appears with the correct session details → click it → verify navigation to the session detail
- [ ] Click "Mark all read" → verify the unread badge disappears
- [ ] Disable SMS in clinic feature flags → trigger a notification that would send SMS → verify no SMS is attempted (check logs)

## Blocked by

- Issue 003 — Staff Management
- Issue 015 — Session Generation & Queue
