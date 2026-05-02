# 16-notification-system

## What to build

Event-driven notification system: enqueues email and in-app notifications on session create/modify (24h and 1h before reminders), missed sessions, plan expiring/expired/closed, game result-write failure threshold. SMS/WhatsApp behind feature flag. Notification preferences per user.

## Acceptance criteria

- [ ] `POST /v1/notifications/enqueue` — internal endpoint (called by services) to enqueue notification
- [ ] Notification types: ACCOUNT_INVITE, OTP, PASSWORDLESS_SIGNIN, SESSION_REMINDER_24H, SESSION_REMINDER_1H, MISSED_SESSION, PLAN_EXPIRING_7D, PLAN_EXPIRED, PLAN_CLOSED, GAME_RESULT_FAILURE
- [ ] Event-driven enqueue: when Session is created or modified, automatically enqueue 24h and 1h reminder jobs
- [ ] Job cancellation: if session changes (time, therapist), existing reminder jobs are cancelled and new ones enqueued
- [ ] `GET /v1/notifications` — list user's notifications (paginated)
- [ ] `PATCH /v1/notifications/:id/read` — mark notification as read
- [ ] `GET /v1/notifications/preferences` — get notification preferences
- [ ] `PATCH /v1/notifications/preferences` — update preferences (email in-app SMS/WhatsApp per notification type)
- [ ] Email delivery via configured email service (Nodemailer/SendGrid)
- [ ] SMS/WhatsApp behind feature flag `sms_notifications`
- [ ] In-app notification center with real-time update (polling or SSE)
- [ ] Prisma: Notification model with user_id, type, payload JSON, read_at, enqueued_at, scheduled_for
- [ ] Frontend: Notification bell icon with unread count, notification drawer, preferences page
- [ ] Integration tests: reminder jobs enqueued on session create, cancelled on session modify, delivery confirmation

## Blocked by

- [10-session-runner-room-booking.md](./10-session-runner-room-booking.md)

## User stories

- #62: User receives email and in-app notifications for: account invites, OTP, passwordless sign-in, upcoming sessions (24h and 1h before, to therapist and clinic admin), missed sessions (to doctor and clinic admin), plan expiring in 7 days, plan expired, plan closed, game result-write failure threshold
- #63: Clinic Admin opts into SMS/WhatsApp notifications behind feature flag
- #64: Backend enqueues 24h and 1h reminder jobs when session is created or modified, and cancels them if session changes

## QA checklist

- [ ] 24h reminder job scheduled correctly (session time - 24h)
- [ ] 1h reminder job scheduled correctly (session time - 1h)
- [ ] Session time change cancels old jobs and creates new ones
- [ ] Missed session notification triggers when attendance marked absent
- [ ] Plan expiring notification triggers at 7 days before end date
- [ ] Game result failure notification triggers when failure threshold exceeded
- [ ] SMS/WhatsApp notifications work when feature flag enabled
- [ ] Notification preferences are respected per user
- [ ] Unread count updates in real time