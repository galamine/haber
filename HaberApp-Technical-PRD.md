# HaberApp — Technical PRD v1.0

## Problem Statement

HaberApp is a multi-tenant SaaS platform for child development clinics that need to run a complete clinical workflow: intake → assessment → treatment plan → in-room game sessions → progress review → plan revision. The platform must embed in-house web games that run in-clinic, persist scored results directly to the backend, enforce a hard 20-minute session cap, support per-child longitudinal dashboards, and comply with India's DPDP Act with special handling for children's sensitive personal data.

---

## Solution

A tenant-isolated, role-based web application (responsive, tablet-friendly) with:
- **Clinic workflow:** Student intake with guardian consent, doctor initial assessment with required milestone tagging, treatment plan builder with versioned modifications, pre-computed session queue with per-game assignments
- **In-room game sessions:** Games run in isolated iframes, communicate with the host via postMessage, write scored results via scoped JWT, enforced 20-min cap with server-side watchdog + client backup, graceful partial-result handling on force-stop
- **Progress tracking:** Per-student dashboards with milestone radar charts and per-game score trends, printable progress reports
- **Multi-doctor flat co-ownership:** All assigned doctors are equal peers; notifications go to all; first-claim wins for review ownership
- **DPDP-compliant:** Guardian consent blocking intake, unanimous guardian consent model, retention-locked soft delete, field-level encryption for PHI

---

## User Stories

### Authentication & Identity

1. As a Super Admin, I want to onboard a new clinic by providing name, address, contact, time zone, and assigning a subscription plan, so that a clinic can begin using the platform
2. As a Clinic Admin, I want to receive an invite email with OTP, complete my profile, and sign in, so that I can set up my clinic
3. As a Clinic Admin, Doctor, Therapist, or Staff member, I want to sign in with email + OTP (6-digit, 10-min validity, max 5 attempts, rate-limited), so that I can access the platform without a password
4. As a user, I want my sessions to expire after 24 hours of idle time and support refresh token rotation with reuse detection, so that old devices can be remotely logged out
5. As a user, I want "log out everywhere" to invalidate all my refresh tokens, so that I can trust my account security on lost devices

### Tenant & Subscription Management

6. As a Super Admin, I want to create subscription plans with `max_users_by_role`, `max_sensory_rooms`, `max_active_students`, `feature_flags`, and `tier` (basic/advanced/enterprise), so that I can control what each clinic can do
7. As a Super Admin, I want to suspend and reactivate a clinic without deleting data, so that billing disputes or contract issues don't cause data loss
8. As a Clinic Admin, I want to see which plan features are enabled for my tier, so that I know what capabilities I have access to

### Clinic Structure

9. As a Clinic Admin, I want to create departments (name, head, description), so that I can organize my staff logically
10. As a Clinic Admin, I want to create sensory rooms with name/code, optional department, equipment list, and status (active/maintenance), so that therapists know what rooms are available
11. As a Clinic Admin, I want to toggle which games in the central library are enabled or disabled for my clinic, so that I control what doctors can prescribe

### Staff Management

12. As a Clinic Admin, I want to invite a user by email, assign them a role (Doctor/Therapist/Staff), set granular permissions (e.g., `student.intake`, `session.run`, `treatment_plan.modify`), assign them to one or more departments, and deactivate without deleting, so that I can manage clinic access precisely
13. As a Clinic Admin, I want to grant a senior therapist `student.intake` and `treatment_plan.modify_minor` in addition to their default permissions, so that I have flexibility beyond rigid role defaults
14. As a Clinic Admin, I want to receive a count of active users per role against my plan limits, so that I know when I'm approaching capacity

### Student Intake

15. As Staff (anyone with `student.intake` permission), I want to create a student profile with: Student ID (auto), OP Number (manual), full name, DOB, sex, optional photo, guardian names/relation/phone/email, address, height, weight (with measurement date), spoken languages, school, preferred therapist, so that the clinic has a complete record
16. As Staff, I want to record structured + free-text medical history: birth history (term/preterm, complications), immunizations, allergies, current medications (read-only list), prior diagnoses, family history, sensory sensitivities, so that the doctor has context for assessment
17. As Staff, I want to capture guardian consent (typed name + checkbox + timestamp + IP) for treatment, data processing, and optional image/video capture, so that we are DPDP-compliant before any clinical activity
18. As Staff, I want to register each guardian as a user record (with email/phone) at intake without enabling login, so that the V2 parent portal can attach without a data backfill
19. As a Doctor, I want the system to block starting an assessment unless all required intake fields and consent are complete, so that no assessment happens without proper intake
20. As a Clinic Admin or Super Admin, I want to soft-delete a student (mark `deleted_at`) and have their data retained for the statutory period (default 7 years), so that we comply with DPDP erasure obligations while retaining audit data
21. As a Clinic Admin and Super Admin, I want to co-approve a hard delete of a student after retention period expires, so that DPDP "right to erasure" is fully honored

### Doctor Assessment

22. As a Doctor, I want to record an initial assessment when a student has no active assessment: chief concern (multi-select + free text), observations (free text), findings (structured per body system + free text), notes, diagnosis (free text + milestone tags), recommended baseline games, so that the clinical picture is documented
23. As a Doctor, I want to tag at least one specific (leaf-level) milestone from the clinic's custom milestone framework on every assessment, so that structured data is available for dashboards and the future recommender
24. As a Doctor, I want assessment records to be versioned — subsequent reviews append, never overwrite — so that history is preserved
25. As a Doctor, I want assessments to be scoped to the student's assigned doctors, so that not every doctor in the clinic sees every student

### Treatment Plan Builder

26. As a Doctor, I want to build a treatment plan with: name, program length (e.g., 8 weeks), optional phases (e.g., 4 cycles of 2 weeks), start date, projected end date, target milestones, status (`draft`/`active`/`paused`/`completed`/`closed`), so that I have a complete clinical prescription
27. As a Doctor, I want to add games to a plan with per-game overrides: duration_seconds, repetitions, frequency_per_week, instructions, applies_to_phase, so that the prescription is precise
28. As a Doctor, I want the system to validate that the sum of game durations per session is less than 20 minutes (hard stop) and warn at 18 minutes, so that the session cap is enforced automatically
29. As a Doctor, I want plan modifications to be immediately active and create a new versioned row with `is_active` flag, so that audit trail exists and the current plan is always queryable
30. As a Doctor, I want to pin each game in the plan to a specific `game_version`, so that game updates don't silently change in-flight treatment plans
31. As a Doctor, I want to activate, pause, resume, extend duration, or close a plan (with closure reason and outcome summary), so that I control the plan lifecycle
32. As a Doctor, I want to browse the game library with filters (category, sub-category, target issues, difficulty, age range) when building a plan, so that I can find the right games for my patient

### Session Execution

33. As a Super Admin or backend cron, I want sessions to be pre-computed (batch-generated nightly or on-plan-activation) for each student with an active plan, so that the daily queue is predictable
34. As a Therapist, I want to see "Today's Sessions" — a list of sessions scheduled for me today with room assignment and student summary — so that I know what to run
35. As a Therapist, I want to see pre-linked game assignments on my session (game ID, version, level, duration, reps, instructions, scoring rubric reference), so that I know exactly what to launch
36. As a Therapist, I want to assign a specific room to a session, so that rooms are booked and conflicts are avoided
37. As a Therapist, I want to launch a game in an iframe within the app and have the system start a server-side session timer only after the game sends a `READY` postMessage, so that the 20-min cap only runs when the game is actually playing
38. As a Therapist, I want the game to receive: student name, age, milestone tags, session context via postMessage, and game config (game_id, version, level) in URL params, so that the game has the context it needs
39. As a Therapist, I want the game to authenticate to the results API using a scoped JWT (scope: `session:write_results`, pinned to `session_id`, 15-min expiry) received via postMessage, so that the game cannot access other clinic data if compromised
40. As a Therapist, I want to see game results appear live on the session screen as `POST /api/v1/sessions/{session_id}/results` returns, so that I can monitor progress in real time
41. As a Therapist, I want an 18-minute soft warning to appear in the host app, so that I have 2 minutes to wrap up
42. As a Therapist, I want the host to send `FORCE_STOP` at 20 minutes, give the game a 5-second grace period to write a final partial result, and then destroy the iframe, so that the session ends safely and a partial record is captured
43. As a Therapist, I want the session screen to show partial results inline with a `partial: true` flag when time ran out mid-game, so that I have a complete picture of what happened
44. As a Therapist, I want to mark a session complete only after explicitly confirming attendance (attended/absent), so that attendance is a clean clinical and billing metric
45. As a Therapist, I want to attach notes and optionally tag session quality (distracted, calm, refused) when completing a session, so that clinical context is captured
46. As a Clinic Admin, I want rooms to support optional advance booking but allow same-day claim of idle rooms, so that scheduled sessions have a room and drop-in flexibility is preserved
47. As a Clinic Admin, when a therapist is absent, I want their pre-assigned sessions to show as available to any therapist who is free to claim them (first-claim first-served), so that coverage works without manual reassignment
48. As a Therapist, I want to see my claimed sessions and not lose them to others once claimed, so that there is no race condition mid-session

### Game Result Ingestion

49. As a game runtime (in-app iframe), I want to `POST /api/v1/sessions/{session_id}/results` with idempotency key, so that results are persisted reliably even on flaky tablet networks
50. As the backend, I want to accept multiple results per session (append-only, last-write-wins for edits), so that if a game is restarted both attempts are recorded clinically
51. As the backend, I want to store `scored.score`, `scored.rubric_version`, `raw_metrics`, and `events[]` with the result, so that historical scores are locked to the rubric version they were measured under
52. As a Super Admin, I want a game-runtime health dashboard showing result-write success/failure rates, latency, and error rates per game, so that I can spot degraded games quickly

### Progress Dashboards & Reporting

53. As a Doctor or Therapist, I want a per-student dashboard with: snapshot card (name, age, OP, active plan, next session, attendance %), milestone radar/spider chart over time, per-game line charts of scores, session calendar with attendance, notes timeline, plan timeline with version markers, so that I have a complete longitudinal view
54. As a Clinic Admin, I want a clinic dashboard with: active students, sessions today/this week, room utilization, therapist load, plan adherence rate, top categories by activity, so that I can manage clinic operations
55. As a Super Admin, I want a platform dashboard with: tenants by tier, MAU per role, game runtime health, plan usage vs caps, error rates, so that I can manage the platform
56. As a Doctor, I want to export a student progress report as a print-ready view (structured JSON from API, client-side rendering), so that I can share it with guardians or other clinicians
57. As a Clinic Admin, I want per-tenant branding (logo on reports) behind a feature flag, so that clinics can feel ownership of their documents

### Rule-Based Recommender

58. As a Doctor, I want to see a ranked list of recommended game changes (add/remove/frequency adjustment) during periodic review, each with a rule citation explaining why, so that recommendations are transparent and clinically defensible
59. As a Doctor, I want to accept, modify, or reject each recommendation, so that the recommender is an aid, not an authority
60. As a Clinic Admin or clinical advisor, I want to author rules in a structured DSL (e.g., "IF avg(score, last 3 sessions, category='Balance') < 40 THEN recommend ADD games from category='Balance' with difficulty='easy'"), so that clinical logic is expressible without code
61. As the system, I want every recommendation, doctor decision, and override to be logged with actor, timestamp, and reason, so that the recommender is auditable

### Notifications & Alerts

62. As a user, I want to receive email and in-app notifications for: account invites, OTP, passwordless sign-in, upcoming sessions (24h and 1h before, to therapist and clinic admin), missed sessions (to doctor and clinic admin), plan expiring in 7 days, plan expired, plan closed, game result-write failure threshold, so that I stay informed of clinically relevant events
63. As a Clinic Admin, I want SMS/WhatsApp notifications behind a feature flag, so that clinics can opt in to higher-deliverability channels
64. As the backend, I want to enqueue 24h and 1h reminder jobs when a session is created or modified, and cancel them if the session changes, so that notifications are always accurate and timely

### Milestone Framework

65. As a Super Admin or clinical advisor, I want HaberApp to seed a canonical milestone framework (milestone ID, age band in months, scoring scale min/max, description, parent milestone ID for hierarchy), so that clinics have a clinical standard to start from
66. As a Clinic Admin, I want to add clinic-specific milestones as extensions (with a `milestone.framework_id = 'clinic_{tenant_id}'`), so that my clinic can track milestones not in the canonical set
67. As a Clinic Admin, I want the canonical 10 game categories to be global (Gross Motor, Fine Motor, Sensory Integration, Visual-Motor, Cognitive, Speech & Language, Social, Self-Care, Balance, Coordination) with sub-categories, and I want to be able to add tenant-specific sub-category extensions, so that the taxonomy is standardized but extensible

### Multi-Doctor Coverage

68. As a Doctor, I want multiple doctors to be co-assigned to a student (flat, no primary), so that shared care arrangements are supported
69. As a Doctor, when a student's 2-month review is due, I want all assigned doctors to receive the notification, so that no one misses it
70. As a Doctor, I want the first doctor to open the review to become the "reviewing doctor" for this cycle, with other doctors' notifications marked as addressed, so that duplicate work is avoided
71. As a Clinic Admin, I want to designate a primary doctor per student, so that accountability is clear when doctors co-own patients

### Audit & Compliance

72. As a Super Admin or Clinic Admin, I want every sign-in, role change, plan modification, and PHI access to be logged with actor, timestamp, IP, and entity, so that the platform is auditable
73. As a Super Admin, I want field-level encryption for medical history and diagnoses, AES-256 at rest, TLS 1.2+ in transit, so that PHI is protected
74. As a Super Admin, I want all PHI stored in India region (DPDP data residency), so that we are compliant with Indian law
75. As a Clinic Admin, I want to see and fulfill DPDP data principal requests (access, correction, erasure, grievance) from within admin tools, so that we honor our fiduciary obligations

---

## Implementation Decisions

### Architecture

- **Frontend:** React app (monorepo in `apps/frontend`), responsive/tablet-friendly
- **Backend:** Express.js API (monorepo in `apps/backend`)
- **Shared:** Zod schemas, DTOs, constants (`packages/shared`)
- **Database:** PostgreSQL with Prisma ORM
- **Game runtime:** Games are iframes loaded from separate deploy origins (separate build pipeline). Host-to-game communication via postMessage (`LAUNCH` → `READY` handshake, `FORCE_STOP`, `GAME_RESULT`).
- **Game config delivery:** `game_id` and `version` in iframe URL params (for CDN caching and direct linkability); session context (student name, age, milestone tags, `session_id`, `scoped_jwt`) via postMessage `LAUNCH` message
- **Scoped JWT:** Server mints a derived token with claims `sub: user_id`, `scope: session:write_results`, `session_id: session_id`, `exp: now + 15min`. Game uses it as Bearer token. Games cannot read other student data.
- **Session timer:** Server-side watchdog (`session.started_at`, `session.planned_end_time`) with client backup. `SESSION_START` call at game launch. `FORCE_STOP` push at 20 min. Host polls or receives push and destroys iframe.
- **Partial result on force-stop:** Game receives `FORCE_STOP`, has 5s grace to `POST /results` with `partial: true`, then iframe is destroyed.

### Data Model

- **Primary keys:** UUID v4 (`gen_random_uuid()`)
- **Soft delete:** `deleted_at` on `Student` and `Guardian` (DPDP data principals); `status` enum on operational records (`Session`, `TreatmentPlan`)
- **History tables:** Separate tables per entity (`StudentHistory`, `PlanHistory`, `AssessmentHistory`, `TreatmentPlanVersion`) — not polymorphic `AuditLog`
- **Denormalization:** `Student.latest_plan_id`, `Session.assigned_therapist_id`, `SessionGameAssignment` pre-linked at session generation time
- **Plan versioning:** All versions coexist in same `TreatmentPlan` table with `is_active` flag. Modification sets previous `is_active = false`, inserts new row as `is_active = true`.
- **Game result immutability:** Scores locked to rubric version at session time. No recomputation on rubric change.
- **Tenant scoping:** All tenant-scoped resources (Student, Session, Plan, etc.) enforce tenant isolation server-side from JWT `tenant_id`. No nested URLs needed.
- **Guardian consent:** Stored as separate `ConsentRecord` with typed name, checkbox, timestamp, IP. Blocking — student cannot proceed to assessment without completed consent.
- **Unanimous guardian consent:** All guardians must have valid active consent. If any guardian withdraws, student's status is flagged and treatment pauses pending clinic resolution.

### API Design

- **URLs:** Flat resource URLs (`/students`, `/sessions`, `/sessions/{id}/results`). Tenant scoping enforced server-side.
- **Pagination:** Page-based with `X-Total-Count`, `X-Total-Pages` headers. `page` and `limit` query params.
- **Error envelope:** `{ "error": { "code": "MACHINE_CODE", "message": "Human message", "details": {} } }`
- **Idempotency:** `POST /sessions/{session_id}/results` requires `Idempotency-Key` header (UUID). Duplicate key returns 200 with stored response.
- **Game result writes:** Append-only. Multiple results per session. Last-write-wins for edits (no version history on individual results).
- **Notifications:** Event-driven enqueue on session create/modify. 24h and 1h jobs. Cancelled on session change.

### Game Library

- **10 global categories** seeded by HaberApp. Clinics can add tenant-specific sub-categories.
- **Milestone framework:** Relational `Milestone` table with core fields (id, framework_id, age_band_min_months, age_band_max_months, scoring_scale_min/max, description, parent_milestone_id). Clinic-specific extensions in `extensions JSONB`.
- **Game versioning:** Edits create new `game_version` row. Plans pin to specific `game_version`. Games auto-update only when doctor explicitly updates plan.
- **Rubric versioning:** Score stored with `rubric_version`. Historical scores immutable.

### Modules to Build/Modify

| Module | Responsibility |
|---|---|
| `AuthService` | OTP generation/delivery, rate limiting (per email+phone AND per IP), JWT minting (session + scoped game token), refresh token rotation with reuse detection |
| `TenantService` | Clinic CRUD, subscription plan assignment, feature flags |
| `StaffService` | Invite by email+OTP, role/permission management, department assignment, deactivation |
| `StudentService` | Profile CRUD, intake completeness tracking, guardian registration, soft delete, hard-delete co-approval workflow |
| `ConsentService` | Consent capture, unanimous consent validation, withdrawal handling |
| `AssessmentService` | Initial assessment with required milestone tagging, versioned append-only records |
| `TreatmentPlanService` | Plan builder, per-game configuration, versioned modifications, `is_active` lifecycle, plan closure |
| `SessionGenerator` | Nightly cron job — generates `Session` records and `SessionGameAssignment` records from active plans |
| `SessionService` | Session start/stop, attendance confirmation, force-stop trigger, partial result handling, room booking |
| `GameResultService` | Ingest results via `POST /sessions/{id}/results`, idempotency, partial flag, append semantics |
| `GameRuntimeBridge` | postMessage protocol: `LAUNCH` → `READY` handshake, `FORCE_STOP`, `GAME_RESULT`. Manages iframe lifecycle. |
| `ScopedTokenService` | Mint scoped JWT for game iframe with `session:write_results` scope, pinned to `session_id`, 15-min expiry |
| `SessionWatchdog` | Server-side timer: records `session.started_at` on launch, sends `FORCE_STOP` at 20 min via push/polling |
| `MilestoneFrameworkService` | Global canonical milestones + tenant extension management |
| `GameLibraryService` | Game catalog CRUD, category/sub-category management, version pinning, clinic-level enable/disable |
| `NotificationService` | Event-driven notification enqueueing (24h/1h), email delivery, SMS behind feature flag |
| `RecommenderService` | Rule engine: rule authoring DSL, recommendation generation with rule citation, doctor accept/modify/reject, audit logging |
| `DashboardService` | Per-student, per-clinic, and platform-wide aggregations |
| `ReportService` | Structured JSON export for progress reports; client-side print rendering |
| `AuditService` | Append entries to entity-specific history tables (`StudentHistory`, `PlanHistory`, etc.) |
| `DPDPService` | Data principal rights tooling, erasure workflow, retention policy enforcement |

---

## Testing Decisions

- **Good test definition:** Test only observable external behavior — API request/response contracts, postMessage protocol sequences, database state changes. Do not test implementation details (internal function calls, private state).
- **Modules to test:**
  - `SessionGenerator` — given an active plan with frequency, verify correct number and timing of sessions generated
  - `ScopedTokenService` — verify token scope, session_id pin, expiry
  - `GameResultService` — idempotency (duplicate Idempotency-Key returns stored response), partial flag handling, append semantics
  - `SessionWatchdog` — verify `FORCE_STOP` fires at 20 min and not before
  - `ConsentService` — unanimous consent validation, withdrawal triggers pause
  - `TreatmentPlanService` — version increment, `is_active` swap on modify, game version pinning
- **Prior art:** Similar Jest + Supertest patterns already in `apps/backend/src/__tests__/`

---

## Out of Scope

- Parent-facing portal or mobile app (V2)
- Medication management
- Pathology or patient medical data storage beyond intake history
- Billing/invoicing in-app (beyond subscription plan assignment)
- Telehealth/video consultation
- Insurance integration
- Native mobile apps for staff
- Doctor-authored games (game-suggestion tickets only)
- Standardized screening tools (ASQ, M-CHAT) as add-ons
- ICD-10 diagnosis codes
- Public API for EMR/HIS integration
- ML-based recommender (rule-based only in V1)
- External hardware/sensor integration
- Localization beyond en-IN
- Per-tenant branding (V2)
- SMS/WhatsApp provider selection and integration
- Pricing/tier entitlement model (concrete Basic/Advanced/Enterprise entitlements not defined)

---

## Further Notes

- Open Question #1 (final 10 categories + milestone mapping per age band) and Open Question #2 (custom milestone schema seed content) require clinical advisor sign-off before implementation begins
- Open Question #3 (game-suggestion ticket workflow) is V2 territory; no in-app mechanism for doctors to submit game requests in V1
- Open Question #6 (sensory room scheduling) is resolved as hybrid: optional advance booking with same-day idle-room claim
- Open Question #7 (therapist substitution) is resolved as first-claim first-served for absent therapist's sessions
- The 20-min session cap is a clinical safety constraint — server-side watchdog is the source of truth; client timer is backup only
- Guardian user records are created at intake without login enabled — this is intentional for V2 parent portal attachability
- Multi-doctor coverage is flat (no primary) — notification goes to all, first-claim is reviewing doctor for that cycle