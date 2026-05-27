# HaberApp — Technical PRD v2.0

## Problem Statement

HaberApp is a multi-tenant SaaS platform for child development clinics that need to run a complete clinical workflow: intake → initial assessment (Form 1) → treatment plan → in-room therapy sessions (with embedded web games) → follow-up assessment (Form 2) → plan revision. The platform must embed in-house web games that run in-clinic, persist scored results directly to the backend via secure webhooks, enforce a template-driven session duration (typically 45 or 60 min per the active plan), support per-child longitudinal dashboards, and comply with India's DPDP Act with special handling for children's sensitive personal data.

---

## Solution

A tenant-isolated, role-based web application (responsive, tablet-friendly) with:
- **Clinic workflow:** Child intake with guardian consent, structured initial assessment (Form 1) with diagnoses / developmental milestones / sensory profile / functional concerns / standardised tools / goals, treatment plan builder with versioned modifications (optionally cloned from one of five clinical presets), pre-generated session queue with per-game assignments, structured follow-up assessment (Form 2) every 4–6 sessions
- **In-room therapy sessions:** The therapist selects a game from the session plan and opens it in a new browser tab, passing `game_id`, `version`, `session_id`, and `webhook_secret` as URL parameters. The game calls back to HaberApp via two webhook endpoints: `POST /api/sessions/:id/start` (records session start time) and `POST /api/sessions/:id/complete` (submits results and closes the session). Session duration (`session_duration_minutes`) is a soft advisory used in the plan builder; it is not enforced at runtime.
- **Goal tracking:** Goals are first-class with horizon (short-term 4–6 wk / long-term 3–6 mo), `% attainment`, and status (Met / In Progress / Not Met / Discontinued). Reviewed at every follow-up; plan modification discontinues old goals and creates new versioned ones.
- **Progress tracking:** Per-child dashboards with milestone radar charts, sensory-system change deltas vs. baseline, per-game score trends, printable progress reports
- **Multi-therapist flat co-ownership:** All assigned therapists are equal peers; a review-due indicator is visible to all; first-claim wins for review ownership that cycle
- **DPDP-compliant:** Guardian consent blocking intake, unanimous guardian consent model, retention-locked soft delete, data residency in India

---

## User Stories

### Authentication & Identity

1. As a Super Admin, I want to onboard a new clinic by providing name, address, contact, and time zone, so that a clinic can begin using the platform

2. As a Clinic Admin, I want to receive an invite email with OTP, complete my profile, and sign in, so that I can set up my clinic

3. As a Super Admin, Clinic Admin, Therapist, or Staff member, I want to sign in with email + OTP (6-digit, 10-min validity, max 5 wrong-code attempts per OTP before invalidation, max 3 OTP requests per email per 10 minutes), so that I can access the platform securely without a password

4. As a user, I want my sessions to expire after 24 hours of idle time and support refresh token rotation with reuse detection, so that old devices can be remotely logged out

5. As a user, I want "log out everywhere" to invalidate all my refresh tokens, so that I can trust my account security on lost devices

### Clinic Structure

6. As a Clinic Admin, I want to create departments (name, head, description), so that I can organise my staff logically

7. As a Clinic Admin, I want to create sensory rooms with name/code, optional department, equipment list, and status (active/maintenance), so that therapists know what rooms are available

8. As a Clinic Admin, I want to toggle which games in the central library are enabled or disabled for my clinic, so that I control what therapists can prescribe

### Staff Management

9. As a Clinic Admin, I want to invite a user by email, assign them a role (Therapist/Staff), set granular permissions (e.g., `child.intake`, `session.run`, `treatment_plan.modify`), assign them to one or more departments, and deactivate without deleting, so that I can manage clinic access precisely

10. As a Clinic Admin, I want to grant a senior therapist `child.intake` and `treatment_plan.modify_minor` in addition to their default permissions, so that I have flexibility beyond rigid role defaults

### Child Intake

11. As Staff (anyone with `child.intake` permission), I want to create a child profile with: Child ID (auto), OP Number (manual), full name, DOB, sex, optional photo, guardian names/relation/phone/email, address, height, weight (with measurement date), spoken languages, school, preferred therapist, so that the clinic has a complete record

12. As Staff, I want to record structured + free-text medical history: birth history (term/preterm, complications), immunisations, allergies, current medications (read-only list), prior diagnoses, family history, sensory sensitivities, so that the therapist has context for assessment

13. As Staff, I want to capture guardian consent (typed name + checkbox + timestamp + IP) for treatment, data processing, and optional image/video capture, so that we are DPDP-compliant before any clinical activity

14. As Staff, I want to register each guardian as a user record (with email/phone, login disabled) at intake without enabling login, so that the V2 parent portal can attach without a data backfill

15. As a Therapist, I want the system to block starting an assessment unless all required intake fields and consent are complete, so that no assessment happens without proper intake

16. As a Clinic Admin or Super Admin, I want to soft-delete a child (mark `deleted_at`) and have their data retained for the statutory period (default 7 years), so that we comply with DPDP erasure obligations while retaining audit data

### Therapist Assessment

17. As a Therapist, I want to record an initial assessment when a child has no active assessment: chief concern (multi-select + free text), observations (free text), findings (structured per body system + free text), notes, diagnosis (free text + milestone tags), recommended baseline games, so that the clinical picture is documented

18. As a Therapist, I want to tag at least one specific (leaf-level) milestone from the clinic's custom milestone framework on every assessment, so that structured data is available for dashboards

19. As a Therapist, I want assessment records to be versioned — subsequent reviews append, never overwrite — so that history is preserved

20. As a Therapist, I want assessments to be scoped to the child's assigned therapists, so that not every therapist in the clinic sees every child

### Treatment Plan Builder

21. As a Therapist, I want to build a treatment plan with: name, program length (e.g., 8 weeks), optional phases (e.g., 4 cycles of 2 weeks), start date, projected end date, target milestones, status (`draft`/`active`/`paused`/`completed`/`closed`), so that I have a complete clinical prescription

22. As a Therapist, I want to add games to a plan with per-game overrides: duration_seconds, repetitions, frequency_per_week, instructions, applies_to_phase, so that the prescription is precise

23. As a Therapist, I want the system to show a soft (non-blocking) warning if the sum of game durations per session exceeds the plan's `session_duration_minutes`, so that session length is visible during planning

24. As a Therapist, I want plan modifications to be immediately active and create a new versioned row with `is_active` flag, `version_number`, and `parent_plan_id` back-reference, so that an audit trail exists and the current plan is always queryable

25. As a Therapist, I want to pin each game in the plan to a specific `game_version`, so that game updates don't silently change in-flight treatment plans

26. As a Therapist, I want to activate, pause, resume, extend duration, or close a plan (with closure reason and outcome summary), so that I control the plan lifecycle

27. As a Therapist, I want to browse the game library with filters (category, sub-category, target issues, difficulty, age range) when building a plan, so that I can find the right games for my patient

### Session Execution

28. As a Therapist or the system, I want sessions to be generated for the full plan duration when a plan is activated, and regenerated for affected future dates when a plan is modified, so that the schedule is always current without a nightly job

29. As a Therapist, I want to see "Today's Sessions" — a list of sessions scheduled for me today with room assignment and child summary — so that I know what to run

30. As a Therapist, I want to see pre-linked game assignments on my session (game ID, version, level, duration, reps, instructions, scoring rubric reference), so that I know exactly what to launch

31. As a Therapist, I want to assign a specific room to a session, so that rooms are booked and conflicts are avoided

32. As a Therapist, I want to open a game in a new browser tab by clicking "Open Game", and have the server record the session start only after the game calls the start webhook (`POST /api/sessions/:id/start`), so that the session start time is accurate

33. As a Therapist, I want the game to receive `game_id`, `version`, `session_id`, and `webhook_secret` as URL parameters when opened, so that the game has all the configuration and authentication it needs

34. As a Therapist, I want the game to authenticate its webhook calls to HaberApp using the `session_id` and `webhook_secret`, so that only the authorised game session can submit results

35. As a Therapist, I want results to appear on the session screen after the game calls the complete webhook (`POST /api/sessions/:id/complete`), so that I can review what was captured once the game finishes

36. As a Therapist, I want to manually close a session from the session screen if the game does not call the complete webhook, so that sessions can always be closed cleanly regardless of game behaviour

37. As a Therapist, I want to mark a session as absent when the child did not attend, so that attendance is a clean clinical metric distinct from completed sessions

38. As a Therapist, I want to attach notes and optionally tag session quality (distracted, calm, refused) when closing a session, so that clinical context is captured

39. As a Clinic Admin, I want rooms to support optional advance booking but allow same-day claim of idle rooms, so that scheduled sessions have a room and drop-in flexibility is preserved

40. As a Clinic Admin, when a therapist is absent, I want their pre-assigned sessions to show as available to any therapist who is free to claim them (first-claim first-served), so that coverage works without manual reassignment

41. As a Therapist, I want to see my claimed sessions and not lose them to others once claimed, so that there is no race condition mid-session

### Game Result Ingestion

42. As a game (hosted on an external server), I want to call `POST /api/sessions/:id/complete` with the session results, so that results are persisted reliably once the game session ends

43. As the backend, I want the complete webhook to be idempotent on `session_id` so that duplicate calls return the already-stored result without duplication

44. As the backend, I want to store `scored.score`, `scored.rubric_version`, `raw_metrics`, and `events[]` from the complete webhook payload, so that historical scores are locked to the rubric version they were measured under

### Progress Dashboards & Reporting

45. As a Therapist, I want a per-child dashboard with: snapshot card (name, age, OP, active plan, next session, attendance %), milestone radar/spider chart over time, per-game line charts of scores, session calendar, notes timeline, plan timeline with version markers, so that I have a complete longitudinal view

46. As a Clinic Admin, I want a clinic dashboard with: active children, sessions today/this week, room utilisation, therapist load, plan adherence rate, top categories by activity, so that I can manage clinic operations

47. As a Super Admin, I want a platform dashboard listing all registered clinics with name, creation date, active children count, active therapists count, and sessions this month, so that I have operational visibility across the platform

48. As a Therapist, I want to export a child progress report as a print-ready view (structured JSON from API, client-side rendering), so that I can share it with guardians or other clinicians

### Milestone Framework

49. As a Super Admin or clinical advisor, I want HaberApp to seed a canonical milestone framework (milestone ID, age band in months, scoring scale min/max, description, parent milestone ID for hierarchy), so that clinics have a clinical standard to start from

50. As a Clinic Admin, I want to add clinic-specific milestones as extensions (with a `milestone.framework_id = 'clinic_{tenant_id}'`), so that my clinic can track milestones not in the canonical set

51. As a Clinic Admin, I want the canonical 10 game categories to be global (Gross Motor, Fine Motor, Sensory Integration, Visual-Motor, Cognitive, Speech & Language, Social, Self-Care, Balance, Coordination) with sub-categories, and I want to be able to add tenant-specific sub-category extensions, so that the taxonomy is standardised but extensible

### Multi-Therapist Coverage

52. As a Therapist, I want multiple therapists to be co-assigned to a child (flat, equal peers, no primary), so that shared care arrangements are supported

53. As a Therapist, I want the child's profile and dashboard to show a "review due" indicator visible to all assigned therapists when the review interval has elapsed, so that no review is missed

54. As a Therapist, I want the first therapist to open the review to become the "reviewing therapist" for that cycle, with the review-due indicator cleared for all other assigned therapists, so that duplicate work is avoided

### Initial Assessment Form (Form 1)

> Implements the *Haber Specialisto* initial-assessment form. Sample at `clinical-data/initial-assessment.example.json`. Expected duration to complete: 45–60 min.

55. As a Therapist, I want the initial assessment to capture **patient & referral information** — patient name, DOB, age, gender, date and location of assessment, referring therapist, referral source, primary caregiver name + relationship + contact + email, chief complaint — so that the referral context is documented (most fields auto-populate from the child profile created at intake)

56. As a Therapist, I want to record **medical & developmental history** as structured fields — primary diagnoses (multi-select from the seeded 12-item list with `other` free-text), prenatal history, birth history & complications, neonatal history, gestational age at birth (weeks), past medical/surgical history, current medications, allergies & clinical precautions, previous therapies & duration — so that downstream clinicians have a complete history

57. As a Therapist, I want to record **developmental milestones** for each of the 12 seeded milestones (head control, rolling, sitting, crawling, standing, walking, first words, two-word phrases, toilet training, self-feeding, dressing, eye contact / social smile) with `achieved_at_age_months` (nullable), `delayed` (boolean), and free-text notes, so that the milestone radar chart has structured longitudinal data

58. As a Therapist, I want to record a **sensory processing profile** rating each of 7 sensory systems (Tactile, Vestibular, Proprioceptive, Auditory, Visual, Olfactory/Gustatory, Interoception) on a 1–5 ordinal scale (1 = Hypo-responsive, 3 = Typical, 5 = Hyper-responsive) with per-system notes plus an overall behavioural-observations free-text, so that sensory regulation can be tracked over time

59. As a Therapist, I want to flag **functional & fine-motor concerns** by multi-selecting from the seeded 16-item list (pencil grasp, scissors use, bilateral coordination, etc.) and writing free-text clinical observations, so that intervention targets are clear

60. As a Therapist, I want to record which **standardised assessment tools** were administered (multi-select from the seeded 14-tool list, e.g. SP2, BOT-2, PDMS-2, CARS-2, COPM, MABC-2) with a per-tool free-text scores summary plus an overall scores/percentiles summary, so that tool-based findings are captured and citable

61. As a Therapist, I want the **initial goals & intervention plan** section to capture up to four short-term goals (4–6 weeks) and four long-term goals (3–6 months), recommended frequency (sessions/week), session duration (minutes), intervention setting (clinic/home/school/EI/rehab/hybrid), review period (weeks), home program recommendations, equipment & sensory diet recommendations (multi-select from the equipment catalog), and referrals to other specialists, so that the initial prescription is precise and actionable

62. As a Therapist and Parent/Guardian, I want every initial assessment to be **signed** by the recording therapist (typed name + credentials + timestamp + IP) and **acknowledged** by the parent/guardian (typed name + timestamp + IP, plus a "Consent obtained for assessment and treatment" checkbox), so that the record is clinically and legally complete

### Follow-Up Assessment (Form 2)

> Implements the *Haber Specialisto* follow-up form. Conducted **every 4–6 sessions or when clinically indicated**. Sample at `clinical-data/follow-up-assessment.example.json`.

63. As a Therapist, I want each follow-up to capture **session info** — patient name, follow-up date, therapist, session number, weeks since initial assessment, parent/caregiver presence — so that the visit is contextually anchored

64. As a Therapist, I want to **review every active goal** with `% attainment` (0–100) and status (Met / In Progress / Not Met) plus an evidence note, so that progress is quantified and graphable

65. As a Therapist, I want a **sensory progress check** that re-rates each of the 7 systems on the 1–5 scale and computes `change` against the initial baseline (and the previous follow-up if present), so that sensory shifts are visible at a glance

66. As a Therapist, I want to record **follow-up clinical questions** — improvements at home/school, regression or new concerns, home-program compliance (Excellent / Good / Partial / Minimal / Not started), child engagement & tolerance during the session (Excellent / Good / Fair / Poor), school performance changes, behaviour/emotional-regulation changes, new skills observed, equipment effectively used, therapist clinical observations — so that the qualitative picture is captured

67. As a Therapist, I want to record **plan adjustment & next steps** — goal-status decisions (multi-select: continue all / modify existing / add new / discontinue / refer to specialist), updated goals for the next period, updated home program / sensory diet, next follow-up date, next assessment type, clinical notes for team or supervisor — so that the plan is updated coherently after every review

68. As the system, I want a follow-up to be linkable to its initial assessment, the active treatment plan, and the previous follow-up (if any), so that longitudinal queries (radar deltas, attainment trajectory) are simple

69. As a Therapist and Parent/Guardian, I want every follow-up to require both signatures (typed name + timestamp + IP), so that the record carries clinical and consent provenance

### Goal Tracking

70. As a Therapist, I want every goal to be a first-class entity attached to the treatment plan, with: id, description, horizon (`short_term` / `long_term`), `target_attainment_pct`, current `attainment_pct`, status (`met` / `in_progress` / `not_met` / `discontinued`), and an evidence-notes timeline appended at every follow-up, so that goal progress is queryable independent of the textual plan

71. As a Therapist, when I modify a plan I want to mark each existing goal as `continue` / `modify` / `add` / `discontinue` — where `modify` sets the old goal to `discontinued` (with `superseded_by_goal_id` pointing to the replacement) and creates a new goal on the new plan version — so that goal history is fully preserved

### Treatment Plan Presets

72. As a Therapist, I want to optionally start a treatment plan from one of five clinical presets (selectable by case label or linked diagnosis) so that frequently-encountered presentations have a sensible starting point with presenting concerns, equipment list, session structure, home program, outcome measures, and short/long-term goal templates pre-populated

73. As a Therapist, I want every preset-cloned plan to be fully editable thereafter (the preset is a one-time seed; the per-child plan diverges immediately and lives its own versioned life), so that templates do not constrain individualisation

74. As a Therapist, I want the preset's `session_structure` (an ordered list of `{phase, minutes, label}` blocks) to be carried into the plan as the default in-session phasing, so that the therapist has a structured run-of-show

### Therapist Credentials

75. As a Clinic Admin, I want each therapist user record to optionally carry **professional credentials** — qualifications (e.g., BOT, MOT) and registration number (e.g., AIOTA registration) — and I want assessment signatures to embed those credentials at signing time, so that records are professionally attributable

### DPDP Compliance

76. As a Super Admin, I want all PHI stored in India region (DPDP data residency), so that we are compliant with Indian law

77. As a Clinic Admin or Super Admin, I want to soft-delete a child (`deleted_at`) with data retained for the statutory period (default 7 years), so that DPDP erasure obligations are honoured within operational constraints

---

## Implementation Decisions

### Architecture

- **Frontend:** React 18 app with Vite build tool (monorepo in `packages/client`), responsive/tablet-friendly. Routing via TanStack Router; global state via Zustand; UI components from Radix UI + shadcn/ui; styling with Tailwind CSS 4.0; charts via Recharts; animations via Framer Motion.
- **Backend:** Hono server with tRPC API layer (monorepo in `packages/api`). All client–server communication uses type-safe tRPC procedures — no hand-written REST controllers.
- **Shared:** tRPC router types, Zod schemas, enums, and DTO types (`packages/shared`). Enables end-to-end type safety from database to UI with no manual type duplication.
- **Database:** PostgreSQL 16 with Prisma ORM
- **Infrastructure:** Docker Compose orchestrates four services: PostgreSQL 16, API server (Hono on port 3001), client (Nginx serving the Vite static build), and a top-level Nginx reverse proxy (port 8080) that routes `/api/*` to the API and everything else to the client SPA.
- **Tooling:** pnpm 9 workspace; Turbo 2 for task orchestration and build caching; Biome for linting and formatting; Husky for pre-commit hooks.
- **Email:** Resend SDK for OTP delivery only. No other transactional email in V1.
- **Super Admin bootstrap:** The first Super Admin account is created via a one-time CLI seed script that inserts the row directly into the database. There is no in-app registration path for Super Admin.
- **Game runtime:** Games are hosted on external servers. The therapist selects a game from the session plan and clicks "Open Game" to launch it in a new browser tab. The game URL receives `game_id`, `version`, `session_id`, and `webhook_secret` as URL parameters — no iframe or in-app embedding required.
- **Session webhooks:** The game communicates back to HaberApp via two plain Hono HTTP endpoints (not tRPC): `POST /api/sessions/:id/start` — called by the game when it is ready to begin, records `session.started_at`; and `POST /api/sessions/:id/complete` — called when the game ends, carrying `scored` results, `raw_metrics`, and `events[]`, setting session status to `completed`. Both endpoints require `webhook_secret` in the request body.

### Data Model

- **Primary keys:** UUID v4 (`gen_random_uuid()`)
- **Soft delete:** `deleted_at` on `Child` and `Guardian` (DPDP data principals); `status` enum on operational records (`Session`, `TreatmentPlan`)
- **Denormalization:** `Child.latest_plan_id`, `Session.assigned_therapist_id`, `SessionGameAssignment` pre-linked at session generation time
- **Plan versioning:** All versions coexist in the same `TreatmentPlan` table with `is_active` flag, `version_number` (integer, increments on each modification), and `parent_plan_id` (FK to the preceding version row, null on the first version). Modification sets the previous row's `is_active = false` and inserts a new row as `is_active = true`. No separate history table.
- **Game result immutability:** Scores locked to rubric version at session time. No recomputation on rubric change.
- **Tenant scoping:** All tenant-scoped resources enforce isolation server-side from the JWT `tenant_id` claim. Super Admin JWT carries `tenant_id = null`; Super Admin endpoints authorise by role claim instead.
- **User:** No `password` field. `login_enabled` boolean (set to `false` for guardian user records created at intake). `email_verified` boolean set to `true` on first successful OTP verification.
- **Guardian consent:** Stored as separate `ConsentRecord` with typed name, checkbox, timestamp, IP. Blocking — child cannot proceed to assessment without completed consent. Unanimous model: if any guardian's consent is withdrawn, `Child.consent_status` is set to `withdrawn` and all future unstarted sessions are flagged `blocked_by_consent`. Sessions unblock automatically when consent is restored by the clinic.
- **Session terminal states:** Sessions have three terminal states — `completed` (game called the complete webhook normally), `absent` (therapist marked child as not attending before the game was launched), `manually_closed` (therapist force-closed; game did not call the complete webhook). There is no separate `attendance` field; the terminal state encodes it.
- **Session webhook secret:** `Session.webhook_secret` is a UUID v4 generated at session creation and passed to the game as a URL parameter. Required on both start and complete webhook calls. Marked `used` after the complete webhook is accepted; the complete webhook's idempotency guarantee is enforced by `session_id`, not `webhook_secret`.
- **OTP:** `Otp.attempt_count` tracks failed code entries; the OTP is invalidated after 5 wrong attempts. OTP request rate is capped at 3 requests per email per 10 minutes at the middleware level (independent of attempt_count).
- **Goal entity:** First-class. `id`, `treatment_plan_id`, `description`, `horizon` ∈ {`short_term`, `long_term`}, `target_attainment_pct`, `current_attainment_pct`, `status` ∈ {`met`, `in_progress`, `not_met`, `discontinued`}, `superseded_by_goal_id` (nullable FK to the replacement goal), `created_at`, plus a one-to-many `GoalProgressEntry` (one per follow-up: `attainment_pct`, `status`, `evidence_notes`, `recorded_at`, `follow_up_id`). On plan modification, `modify` sets `status = discontinued` and `superseded_by_goal_id` on the old goal and inserts a new goal on the new plan version.
- **SensoryProfile rating:** `id`, `assessment_id` or `follow_up_id`, `system_id` (FK to seed taxonomy), `rating` (1–5 int), `notes`. Captured once at initial assessment and once per follow-up.
- **FollowUpAssessment entity:** Versioned record linked to `child_id`, `initial_assessment_id`, `treatment_plan_id`, `previous_follow_up_id` (nullable). Embeds goal-progress review, sensory check, qualitative questions, plan-adjustment decisions. Append-only history.
- **Clinical taxonomies (seed data):** Diagnosis, FunctionalConcern, AssessmentTool, Equipment, InterventionApproach are tenant-global lookup tables, seeded from `/clinical-data/clinical-taxonomies.seed.json`. Clinic admins may add tenant-scoped extensions (same pattern as milestones).
- **Therapist credentials:** Optional fields on `User`: `credentials_qualifications` (free text, e.g., "BOT, MOT (Pediatrics)"), `credentials_registration_number` (e.g., AIOTA reg #). Snapshotted onto every assessment / follow-up signature at signing time.
- **Treatment plan presets:** Stored as immutable JSON in `/clinical-data/treatment-plan-presets.json`, loaded by the API at boot. Not versioned, not editable through the app. The five entries (ASD, CP, ADHD, Down Syndrome, DCD) are starter values cloned into a fresh `TreatmentPlan` on demand. `source_preset_id` is recorded on the plan for analytics; no live link is maintained.
- **Plan session duration:** `TreatmentPlan.session_duration_minutes` (int, default from preset; typical values 45 / 60). Used as a soft advisory in the plan builder (US#23). Not enforced at runtime.

### API Design

- **Transport:** tRPC 11 procedures over an HTTP batch link to `/api/trpc`. Procedure paths replace URL routes (e.g., `child.create`, `session.list`, `plan.update`). The tRPC client in `packages/client` is fully type-safe against the router in `packages/api`.
- **Authentication:** Passwordless. Protected tRPC procedures validate a JWT access token (15-min expiry, issued by `auth.verifyOtp` or `auth.refreshToken`). Tokens stored in Zustand's persisted auth store on the client. Refresh tokens rotate on use with reuse detection; 7-day expiry.
- **OTP flow:** `auth.requestOtp` → `auth.verifyOtp`. Codes are 6 digits, 10-min validity, delivered via Resend. Rate-limited: 5 wrong attempts per OTP (OTP invalidated), 3 requests per email per 10 min (middleware). Successful verification sets `User.email_verified = true`.
- **Pagination:** Returned inside tRPC response objects as `{ items, total, page, totalPages }` — no custom HTTP headers.
- **Error format:** tRPC `TRPCError` with `code` (e.g., `UNAUTHORIZED`, `NOT_FOUND`, `BAD_REQUEST`) and `message`.
- **Webhook endpoints (game integration):** Two plain Hono HTTP routes outside tRPC: `POST /api/sessions/:id/start` and `POST /api/sessions/:id/complete`. Both require `webhook_secret` in the request body. `complete` is idempotent on `session_id` — duplicate calls return the stored result.
- **Tenant scoping:** All tenant-scoped resources enforce isolation from the JWT `tenant_id` claim. Super Admin carries `tenant_id = null` and is authorised by role claim on platform-level endpoints.

### Game Library

- **10 global categories** seeded by HaberApp. Clinics can add tenant-specific sub-categories.
- **Milestone framework:** Relational `Milestone` table with core fields (id, framework_id, age_band_min/max_months, scoring_scale_min/max, description, parent_milestone_id). Clinic-specific extensions in `extensions JSONB`.
- **Game versioning:** Edits create new `game_version` row. Plans pin to specific `game_version`. Games auto-update only when therapist explicitly updates the plan.
- **Rubric versioning:** Score stored with `rubric_version`. Historical scores immutable.

### Modules to Build

| Module | Responsibility |
|---|---|
| `AuthService` | OTP generation/delivery via Resend, rate limiting (5 wrong attempts per OTP, 3 requests/email/10 min), JWT minting (access + refresh tokens), refresh token rotation with reuse detection |
| `TenantService` | Clinic CRUD; Super Admin platform dashboard (tenant list with active children, active therapists, sessions this month) |
| `StaffService` | Invite by email+OTP, role/permission management, department assignment, deactivation |
| `ChildService` | Profile CRUD, intake completeness tracking, guardian registration (`login_enabled=false`), soft delete, `consent_status` management |
| `ConsentService` | Consent capture, unanimous consent validation, withdrawal handling (sets `consent_status=withdrawn`, marks unstarted sessions `blocked_by_consent`, unblocks on restoration) |
| `AssessmentService` | Initial assessment (Form 1): required milestone tagging, structured medical history, sensory profile, functional concerns, standardised tools, equipment recommendations, signatures; versioned append-only records |
| `FollowUpAssessmentService` | Follow-up assessment (Form 2): goal progress review, sensory progress check (delta vs baseline), qualitative questions, plan-adjustment decisions, signatures; append-only |
| `GoalService` | Goal CRUD, horizon assignment, attainment tracking, lifecycle decisions on plan modification (continue / modify→new row+discontinue old / add / discontinue), per-follow-up `GoalProgressEntry` append |
| `SensoryProfileService` | Sensory rating capture for 7 systems, baseline at initial assessment, change-vs-baseline at follow-up, charting feed |
| `PlanPresetService` | Reads `/clinical-data/treatment-plan-presets.json`, exposes preset list, clones into fresh editable `TreatmentPlan` |
| `TreatmentPlanService` | Plan builder, per-game configuration, versioned modifications (`is_active` swap, `version_number`, `parent_plan_id`), plan lifecycle, `session_duration_minutes` soft advisory |
| `SessionGenerator` | Generates `Session` and `SessionGameAssignment` records on plan activation for the full plan duration; regenerates affected future sessions on plan modification |
| `SessionService` | Session start (start webhook), session complete (complete webhook), manual close, absent marking, room booking |
| `GameResultService` | Ingests results via complete webhook; idempotent on `session_id`; stores `scored`, `raw_metrics`, `events[]` |
| `MilestoneFrameworkService` | Global canonical milestones (12 OT developmental milestones from *Haber Specialisto* toolkit) + tenant extension management |
| `ClinicalTaxonomyService` | Loads and exposes seeded reference data: Diagnoses, FunctionalConcerns, AssessmentTools, Equipment, InterventionApproaches; tenant-scoped extensions |
| `GameLibraryService` | Game catalog CRUD, category/sub-category management, version pinning, clinic-level enable/disable |
| `DashboardService` | Per-child and per-clinic aggregations |
| `ReportService` | Structured JSON export for progress reports; client-side print rendering |
| `DPDPService` | Soft-delete enforcement, 7-year retention policy |

---

## Testing Decisions

- **Good test definition:** Test only observable external behaviour — tRPC procedure inputs/outputs, webhook request/response contracts, and database state changes. Do not test implementation details (internal function calls, private state).
- **Modules to test:**
  - `SessionGenerator` — given an active plan with frequency, verify correct number and timing of sessions generated for the full plan duration; verify correct regeneration of affected future sessions on plan modification
  - `GameResultService` — idempotency (duplicate `session_id` to complete webhook returns stored result), `scored` + `raw_metrics` + `events[]` persisted, `webhook_secret` required on both webhooks
  - `ConsentService` — unanimous consent validation; withdrawal sets `consent_status=withdrawn` and `blocked_by_consent` on unstarted sessions; restoration unblocks sessions
  - `TreatmentPlanService` — version increment, `is_active` swap on modification, `parent_plan_id` set correctly, game version pinning, preset clone produces detached editable plan with `source_preset_id`
  - `GoalService` — horizon assignment, `% attainment` updates append a `GoalProgressEntry` per follow-up, `modify` creates new goal and sets `discontinued` + `superseded_by_goal_id` on old goal
  - `SensoryProfileService` — baseline captured at initial assessment, change-vs-baseline correctly computed at follow-up
  - `FollowUpAssessmentService` — links to initial assessment + previous follow-up; required signatures; structured plan-adjustment decisions persist
  - `AuthService` — OTP invalidated after 5 wrong attempts; request rate limit (3/email/10 min) enforced; successful OTP verification sets `email_verified = true`
- **Test runner:** Vitest for unit and integration tests (`packages/api/vitest.config.ts`, `packages/client/vitest.config.ts`). Playwright for E2E tests (`packages/client/playwright.config.ts`).

---

## Out of Scope

- Parent-facing portal or mobile app (V2)
- Medication management
- Pathology or patient medical data storage beyond intake history
- Billing/invoicing in-app
- Telehealth/video consultation
- Insurance integration
- Native mobile apps for staff
- Therapist-authored games (game-suggestion tickets only, V2)
- Standardised screening tools as interactive instruments (tools tracked as labels + free-text scores summary only)
- ICD-10 diagnosis codes (seeded 12-item diagnosis taxonomy used instead)
- Public API for EMR/HIS integration
- ML-based recommender; rule-based recommender (V2 — therapists choose games directly from the library in V1)
- External hardware/sensor integration
- Localisation beyond en-IN (V2)
- Per-tenant branding (V2)
- In-app email/SMS notifications for session reminders, plan expiry, and clinical events (V2)
- Subscription plan limits, tier management, and feature flags (V2)
- Hard delete with co-approval workflow (V2 — soft delete with 7-year retention remains)
- DPDP data principal rights tooling beyond soft-delete erasure: access requests, correction requests, grievance management (V2)
- Audit logging service and entity history tables (`ChildHistory`, `PlanHistory`, `AssessmentHistory`) (V2)
- Game runtime health dashboard and webhook error aggregation (V2)
- Server-enforced session duration auto-close / session watchdog (V2)
- Primary therapist designation per child
- Field-level encryption of PHI (V2)
- One-click PDF generation (V1 uses structured JSON + client-side print rendering)
- HIPAA compliance (HaberApp's compliance regime is DPDP-only with India-region data residency)
- Caregiver-side compliance capture UX (home-program-compliance captured by therapist on caregiver's behalf in V1)

---

## Further Notes

- Open Question #1 (final 10 game categories + milestone mapping per age band) and Open Question #2 (custom milestone schema seed content) require clinical advisor sign-off before implementation begins. The 12 OT developmental milestones from the *Haber Specialisto* toolkit are seeded as a starting point; their canonical age bands remain TBD pending sign-off.
- Open Question #3 (game-suggestion ticket workflow) is V2 territory; no in-app mechanism for therapists to submit game requests in V1.
- Sensory room scheduling is hybrid: optional advance booking with same-day idle-room claim (first-write-wins at the database level on the room assignment).
- Therapist substitution for an absent therapist's sessions is first-claim first-served; the session row is locked to the claiming therapist on claim.
- Session duration is template-driven (`TreatmentPlan.session_duration_minutes`, typically 45 or 60 min, defaulted from the active preset). It drives the plan-builder soft advisory only (US#23); there is no runtime enforcement or watchdog.
- Guardian user records are created at intake with `login_enabled = false` — intentional to enable V2 parent portal attachability without a data backfill.
- Multi-therapist coverage is flat (no primary designation). A "review due" indicator is passive and visible to all assigned therapists; the first to open the review claims ownership for that cycle.
- Super Admin bootstrap is a one-time CLI seed script; no in-app registration path exists for Super Admin.
- `webhook_secret` is a UUID v4 generated at session creation and delivered to the game as a URL parameter alongside `session_id`. It must be presented on both the start and complete webhook calls. It is marked `used` after the complete webhook is accepted.
- **Clinical reference data lives in `/clinical-data/`** — `clinical-taxonomies.seed.json` (diagnoses, milestones, sensory systems, functional concerns, standardised tools, equipment, intervention approaches, status / engagement / compliance enums), `treatment-plan-presets.json` (5 case-type starter values), `initial-assessment.example.json` and `follow-up-assessment.example.json` (populated samples documenting the Form 1 and Form 2 shape). These are the source of truth for seed migrations and the contract the API serves to the frontend.
- The five treatment-plan presets are not versioned entities. Once cloned into a per-child plan, the plan diverges immediately and follows the `TreatmentPlan` versioning model (`is_active`, `version_number`, `parent_plan_id`). `source_preset_id` on the plan is for analytics only — preset edits do not propagate.
