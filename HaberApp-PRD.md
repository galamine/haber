# HaberApp — Product Requirements Document (PRD)

**Status:** Draft v0.3
**Owner:** faiyaz (mfaiyazuddeen@gmail.com)
**Date:** 2026-04-29
**Audience:** Software engineering, design, QA, clinical advisors

---

## 1. Overview

HaberApp is a multi-tenant SaaS platform that helps child development clinics detect and treat early childhood developmental issues (motor, sensory, cognitive, social, speech). 

Each clinic operates one or more **sensory rooms** where children play a small, doctor-prescribed set of games per visit. 

Games are **web-based and embedded inside the application itself** — they run in-browser on the staff/therapist device and write scored results directly to the platform. 

Doctors and therapists use the resulting data — together with intake history and clinical observations — to assess milestones, build/modify treatment plans, and a rule-based recommender suggests the next set of games.

**This PRD covers the SOFTWARE only.** It defines both the in-app web games and the surrounding clinical workflow. Any future external hardware/firmware integration is out of scope for V1.

---

## 2. Goals & Non-Goals

### 2.1 Goals (V1)
1. Run a complete clinic workflow end-to-end: intake → assessment → treatment plan → in-room sessions → progress review → plan revision.
2. Provide a tenant-isolated, role-based web app usable by Super Admin, Clinic Admin, Doctor, Therapist, and Reception/Staff users.
3. Run web-based games embedded in the application; persist scored results directly from the in-app game runtime, with each session capped at < 20 minutes.
4. Surface per-child longitudinal progress on dashboards that the doctor uses for review every 2 months (or sooner).
5. Provide a transparent, auditable, rule-based "next-game recommender" that doctors can accept, modify, or override. (not needed in MVP)
6. Be DPDP-compliant from day one (India), with explicit handling of children's data.

### 2.2 Non-Goals (V1)
- No parent-facing portal or mobile app (deferred to V2).
- No medication management.
- No pathology or patient medical data stored.
- No billing/invoicing module beyond subscription billing for the tenant.
- No telehealth/video consultation.
- No insurance integration.
- No native mobile apps for staff (web app is responsive; tablet-friendly).

---

## 3. Personas & Roles

| Role                        | Scope                                     | Primary Activities                                                                                                                                         |
| --------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Super Admin**             | Platform-wide                             | Onboard clinics, configure subscription plans, manage feature flags, view platform-wide telemetry                                                          |
| **Clinic Admin**            | Single tenant (one clinic)                | Create departments and sensory rooms, invite/assign staff, manage roles & permissions, toggle game library entries on/off, view clinic-level analytics     |
| **Doctor**                  | Single tenant; assigned students          | Conduct initial assessment, author diagnosis, build/modify treatment plans, review progress, add new games/activities to clinic library                    |
| **Therapist**               | Single tenant; assigned students/sessions | Run sessions in sensory room, capture qualitative notes, mark sessions complete, suggest plan adjustments to doctor                                        |
| **Staff (incl. Reception)** | Single tenant; permission-based           | Create/edit student profiles, schedule sessions, basic intake. Permission-based, not a rigid role — any user with `student.intake` permission can do this. |

> **Note on roles:** Roles are a default *grouping* of permissions. Clinic Admin may grant or revoke individual permissions per user (e.g., a senior therapist may also get `student.intake` and `treatment_plan.modify_minor`).

---

## 4. Scope Decisions (Locked from Discovery)

| Decision | Choice | Rationale |
|---|---|---|
| Game format | Web-based games embedded inside the application (run in-browser, no external hardware) | Simpler ops, faster iteration, no firmware/webhook surface to maintain in V1 |
| AI scope V1 | **Rule-based recommender** | Transparent, clinically defensible, no training data required; collect data now to power ML in V2 |
| Platforms V1 | Single web app for all user types (responsive, tablet-friendly) | No native apps in V1 |
| Tenant entity | **Clinic** (renamed from "School" in original dump) | Matches medical context |
| Compliance | India DPDP Act + special handling for minors | Children's data treated as sensitive personal data |
| Cadence model | Fully flexible — doctor sets program length, optional phases, per-game duration/reps/frequency per child | Maximum clinical flexibility |
| Game result ingestion | In-app game writes scored results to backend over authenticated API; no external webhook | Games are embedded in the same web app, so direct API calls suffice |
| Clinical framework | Custom milestone framework defined by clinic doctors (not ASQ/M-CHAT/DSM-5 in V1) | Avoids licensing; doctors define ground truth |
| Parents in V1 | **No parent login** | Deferred to V2 |
| Reception model | Permission-based ("anyone with intake permission") | More flexible than a rigid role |
| Hard cap | One session must be < 20 minutes total | Clinical safety/attention-span constraint |

---

## 5. End-to-End User Flows

### 5.1 First-time visit
1. **Reception/Staff** receives walk-in. Creates **Student Profile**: name, DOB, age, guardian info, contact, height, weight, OP number, Student ID, basic info, medical history.
2. **Doctor** opens student record and conducts **Initial Assessment** (target 40 min): chief concern, observations, findings, notes, diagnosis (free-text + tag-based milestones).
3. **Doctor** assigns the child to a **sensory room** for a baseline session of **2 games** (out of the 10 in the relevant category) for assessment.
4. **Therapist** runs the baseline session. The web-based games launch inside the app and write scored results directly to the backend at game end. Therapist adds qualitative notes. Session must end within 20 min.
5. **Doctor** reviews assessment results + intake history + initial diagnosis, then builds the **Treatment Plan**: program length, optional phases, list of games with per-game duration, reps, instructions, frequency. (Target: 20 min.)
6. Plan is activated; sessions are scheduled/queued.

### 5.2 Recurring sessions
1. **Therapist** opens "Today's Sessions" queue, picks the child, picks the sensory room.
2. App shows the games due today per the plan, in suggested order.
3. Each game launches embedded in the app; the in-app game runtime emits scored results directly to the backend in real time and at game end.
4. Therapist marks session complete, captures notes; system enforces < 20 min cap with warnings near 18 min.
5. Plan progresses; dashboard updates.

### 5.3 Doctor periodic review (every 2 months or earlier)
1. **Doctor** sees list of children due for review.
2. Reviews per-child dashboard: trend lines per milestone, game-by-game scores, session attendance, therapist notes.
3. **Rule-based recommender** suggests games to add/remove and any frequency changes; doctor accepts/modifies/overrides.
4. Doctor modifies plan: add/remove games, change frequency, extend duration, or **close** the plan.
5. New version of the plan is saved with full audit trail.

### 5.4 Clinic Admin lifecycle
1. Receives invite email from Super Admin → completes signup with email + OTP.
2. Creates departments and sensory rooms (1..N per clinic).
3. Invites doctors/therapists/staff via email + OTP; assigns roles & permissions.
4. Toggles which game-library entries are enabled for the clinic (within plan limits).
5. Monitors clinic-level metrics: active students, plan adherence, room utilization.

### 5.5 Super Admin lifecycle
1. Onboards a new clinic: creates tenant record (name, location, contact), assigns subscription plan (max users by role, feature flags), sends invite to first Clinic Admin.
2. Manages plans (Basic / Advanced / Enterprise), feature flags, billing status (suspend/reactivate).
3. Reviews platform telemetry and in-app game runtime health.

---

## 6. Functional Requirements

### 6.1 Authentication & Identity
- **Sign in:** email + OTP (no passwords in V1). OTP is 6-digit, 10-min validity, max 5 attempts, rate-limited.
- **Account creation:** invite-only. New users receive an "Account Created" email with a sign-in link; first sign-in completes profile (name, phone, role-specific fields).
- **Session:** JWT, 24-hour idle timeout, refresh tokens, "log out everywhere" supported.
- **MFA (optional V1):** TOTP for Doctors and Admins behind a feature flag.
- **Audit log:** every sign-in, role change, plan modification, and PHI access is logged with actor, timestamp, IP, and entity.

### 6.2 Tenancy & Subscription Management (Super Admin)
- **Create Clinic (Tenant):** name, address, GSTIN (optional), contact name/email/phone, time zone (default Asia/Kolkata), default language (en-IN, hi-IN, ta-IN to start).
- **Subscription Plan fields:**
  - `max_users_by_role` — per-role caps (e.g., 5 doctors, 10 therapists, 20 staff).
  - `max_sensory_rooms` — per-clinic cap.
  - `max_active_students` — per-clinic cap.
  - `feature_flags` — boolean map (e.g., `advanced_analytics`, `recommender_v2`, `bulk_export`, `mfa_required`).
  - `tier` — `basic` | `advanced` | `enterprise`.
  - `billing_cycle`, `start_date`, `end_date`, `status` — active | suspended | expired.
- **Suspend / Reactivate** clinic without deleting data.
- **Plan upgrade/downgrade** mid-cycle, with proration left as a backend concern (no in-app payment in V1; bill out-of-band).

### 6.3 Clinic Admin Module
- **Departments:** CRUD; each department has name, head, description.
- **Sensory Rooms:** CRUD; each room has name/code, department (optional), equipment list, status (active/maintenance). **No cap on number of children per room** — multiple children may use a sensory room concurrently; concurrency is bounded by therapist availability and scheduling, not by a hard room capacity.
- **Staff Management:** invite by email; assign role (Doctor/Therapist/Staff) and permissions (granular checklist); assign to one or more departments; deactivate without delete.
- **Roles & Permissions matrix:** Clinic Admin can override defaults per user. Permission examples:
  - `student.create`, `student.edit`, `student.view`
  - `assessment.create`, `assessment.edit`
  - `treatment_plan.create`, `treatment_plan.modify`, `treatment_plan.close`
  - `game_library.toggle`, `game_library.suggest` (Doctors can file game-suggestion tickets to the vendor)
  - `session.run`, `session.notes`, `session.complete`
  - `analytics.clinic_view`
- **Game Library Toggle:** for each game in the central library, Clinic Admin can enable/disable for the clinic. Disabled games are hidden from doctors when building plans.

### 6.4 Game Library (Catalog)
- **Categories:** target 10 categories (e.g., Gross Motor, Fine Motor, Sensory Integration, Visual-Motor, Cognitive, Speech & Language, Social, Self-Care, Balance, Coordination — final list TBD by clinical advisors).
- **Sub-categories:** each game additionally belongs to one or more **sub-categories** within its category, and is tagged with the **issues / conditions it targets** (e.g., proprioceptive deficit, postural control, attention regulation — final taxonomy TBD with clinical advisors).
- **Difficulty levels:** each game is authored at three difficulty levels — **Beginner**, **Intermediate**, **Advanced**.
- **Games:** target 10 per category (~100 total at launch). Each game has:
  - `id`, `name`, `category`, `sub_categories[]`, `targets_issues[]`, `description`, `target_age_min`, `target_age_max`
  - `instructions` (rich text), `media` (images/video)
  - **Per-level prescription defaults** (to be confirmed with clinical advisors):
    - Beginner: `begin_duration_seconds`, `begin_repetitions`, `begin_frequency_per_week`
    - Intermediate: `inter_duration_seconds`, `inter_repetitions`, `inter_frequency_per_week`
    - Advanced: `advan_duration_seconds`, `advan_repetitions`, `advan_frequency_per_week`
  - `result_schema` (JSON schema produced by the embedded web game)
  - `milestones_assessed[]` — links to milestone definitions
  - `scoring_rubric` — how raw in-game metrics translate to scores 0–100
  - `enabled_globally`, `version`, `created_by`, `authoring_org`
- **Doctor-authored games:** **Not supported in V1.** Doctors who want a new game can submit a **game-suggestion ticket** to the vendor (HaberApp team), which is triaged and, if accepted, built and added to the central library by the vendor.
- **Versioning:** edits create a new version; in-flight treatment plans pin to the version they were created against.

### 6.5 Student Intake
- **Profile fields:** Student ID (auto), OP Number (manual), full name, DOB, sex, photo (optional), guardian name(s)/relation/phone/email, address, height, weight (with date of measurement), spoken languages, school (free text), preferred therapist (optional).
- **Guardians are registered as users:** at intake, each guardian is created as a `User` record (one student can have N guardians) with their email/phone captured. Login for guardians is **not enabled in V1**, but the user record exists so the V2 parent portal can attach without a data backfill. Guardians do not consume `max_users_by_role` seats in V1.
- **Medical history:** structured + free text — birth history (term/preterm, complications), immunizations, allergies, current medications (read-only list), prior diagnoses, family history, sensory sensitivities.
- **Consent:** guardian consent capture (typed name + checkbox + timestamp + IP) for treatment, data processing, and (optional) image/video capture.
- **Soft delete only.** Hard-delete requires Clinic Admin + Super Admin co-approval (DPDP "right to erasure" workflow).

### 6.6 Initial Doctor Assessment
- Triggered when student has no active assessment.
- Fields: chief concern (multi-select + free text), observations (free text), findings (structured per body system + free text), notes, diagnosis (free text + milestone tags from custom framework), recommended baseline games (initially 2 picked from a category).
- Saved as a versioned record; subsequent reviews append, never overwrite.

### 6.7 Treatment Plan Builder
- **Plan-level fields:** name, program length (e.g., 8 weeks), optional **phases** (e.g., 4 cycles of 2 weeks), start date, projected end date, target milestones, status (`draft`, `active`, `paused`, `completed`, `closed`).
- **Per-game configuration in plan:**
  - `game_id` (+ pinned version)
  - `duration_seconds` (override of default)
  - `repetitions`
  - `frequency_per_week`
  - `instructions` (override)
  - `applies_to_phase` (if phases used)
- **Validation:** sum of game durations per scheduled session must be < 20 minutes (hard rule); warn at 18 min.
- **Versioning:** every modification creates a new plan revision with reason-for-change captured. Audit trail shows who changed what when.
- **Lifecycle actions:** Activate, Pause, Resume, Extend duration, Close (with closure reason and outcome summary).

### 6.8 Session Execution (in Sensory Room)
- **Session creation:** auto-generated from active plan based on frequency, OR ad-hoc by therapist.
- **"Today's Queue" view:** list of scheduled sessions per room/therapist.
- **Run session screen:** shows child profile summary, plan, ordered list of games for today, real-time game results as the embedded web game emits them, therapist notes panel.
- **In-app game runtime contract:** see §6.9.
- **Session-side context:** when starting a session, **staff/therapist may need to assign the game JSON (game configuration payload — game id, version, level, duration, reps, instructions, scoring rubric reference) to the active game session** so the embedded game runtime knows exactly what to launch and what parameters to use. The assigned game JSON is persisted with the session record for traceability and is the source of truth the runtime reads from.
- **Time cap enforcement:**
  - Soft warning at 18:00 elapsed.
  - Hard stop at 20:00 — UI prevents starting a new game, hardware is signaled to wind down.
  - Override requires Doctor approval with reason (audited).
- **Mark complete:** therapist confirms attendance, attaches notes, optionally tags session quality (e.g., distracted, calm, refused).

### 6.9 In-App Game Result Contract
Games are web-based and embedded in the application. The in-app game runtime calls the platform API directly (no external webhook).

- **Endpoint:** `POST /api/v1/sessions/{session_id}/results`
- **Auth:** authenticated user session (JWT) of the therapist/staff running the session; tenant scoping enforced server-side.
- **Idempotency:** `Idempotency-Key` header required (UUID generated by the in-app game runtime). Duplicate keys return 200 with stored response, in case of retries on flaky network.
- **Payload (illustrative):**
  ```json
  {
    "session_id": "ses_01H...",
    "game_id": "gam_balance_beam_v3",
    "game_version": 3,
    "level": "intermediate",
    "started_at": "2026-04-27T09:12:11+05:30",
    "ended_at": "2026-04-27T09:16:42+05:30",
    "raw_metrics": { "completion_pct": 0.85, "errors": 1 },
    "scored": { "score": 72, "rubric_version": "v1.2" },
    "events": [ { "t": 11.4, "type": "miss" } ],
    "media_refs": []
  }
  ```
- **Response:** `200` with stored result ID, `202` if accepted but pending validation, `4xx` with error code.
- **Offline/retry:** if the network is briefly unavailable mid-session, the in-app runtime buffers results in browser storage and retries; backend deduplicates by `Idempotency-Key`.
- **Game-runtime health dashboard** for Super Admin: result-write success/failure rates, latency, error rates by game.

### 6.10 Rule-Based Recommender
- **Inputs:** student profile, age, full assessment history, all session results, milestone tags, doctor notes, therapist tags.
- **Rule engine:** Clinic Admin / clinical advisor authors rules in a structured DSL or simple builder UI. Examples:
  - `IF avg(score, last 3 sessions, category="Balance") < 40 THEN recommend ADD games from category="Balance" with difficulty="easy"`
  - `IF score(game_X) > 80 for 4 consecutive sessions THEN recommend REMOVE game_X and ADD next-difficulty game`
  - `IF attendance < 60% in last 14 days THEN recommend ALERT doctor and reduce frequency by 1`
- **Output:** ranked list of recommended changes, each with rule citation. Doctor sees "why" and accepts/edits/rejects per item.
- **Audit:** every recommendation, decision, and override is logged.
- **No black-box ML in V1.** Data is structured to enable future ML.

### 6.11 Dashboards & Reporting
- **Per-Student Dashboard (Doctor/Therapist):**
  - Snapshot card: name, age, OP, active plan, next session, attendance %.
  - Milestone radar/spider chart over time.
  - Per-game line charts of scores.
  - Session calendar with attendance + completion status.
  - Notes timeline.
  - Plan timeline with version markers.
- **Clinic Dashboard (Clinic Admin):**
  - Active students, sessions today/this week, room utilization, therapist load, plan adherence rate.
  - Top categories by activity.
- **Platform Dashboard (Super Admin):**
  - Tenants by tier, MAU per role, in-app game runtime health, plan usage vs caps, error rates.
- **Exports:** CSV / PDF for per-student progress reports (Doctor-initiated).

### 6.12 Notifications & Alerts
- **Channels V1:** email (transactional), in-app notification center. SMS/WhatsApp behind feature flag.
- **Triggers:**
  - Account invite, OTP, password-less sign-in.
  - Upcoming session (24h, 1h before) — to therapist + clinic admin.
  - Missed session — to doctor + clinic admin.
  - Plan expiring in 7 days, expired, closed.
  - In-app game result-write failure threshold per game/runtime.
  - Doctor-review-due (every 2 months by default, configurable per plan).

---

## 7. Data Model (High-Level Entities)

`Tenant (Clinic)` 1—N `Department` 1—N `SensoryRoom`
`Tenant` 1—N `User` (with `Role`, `Permission[]`)
`Tenant` 1—N `Student` 1—N `Guardian` (each `Guardian` is also created as a `User` record at intake — no login enabled in V1, but the user record exists so the guardian-facing portal in V2 can attach to it without backfilling)
`Student` ↔ `Doctor` (M—N) — multiple doctors may co-own one student
`Student` 1—N `AssessmentRecord` (versioned)
`Student` 1—N `TreatmentPlan` (versioned) 1—N `PlanGameItem` → `Game` (pinned `Version`, with `level` ∈ {beginner, intermediate, advanced})
`TreatmentPlan` 1—N `Session` 1—N `GameResult` (from in-app game runtime) 1—N `Event`
`GameLibrary`: `Category` 1—N `SubCategory` 1—N `Game` 1—N `GameVersion`
`MilestoneFramework` 1—N `Milestone` ↔ `Game` (M—N)
`RecommendationRule` (tenant-scoped) → `Recommendation` → `RecommendationDecision`
`SubscriptionPlan` ↔ `Tenant`; `FeatureFlag` map per tenant.
`AuditLog` (append-only) — actor, action, entity, before/after, timestamp.

---

## 8. Non-Functional Requirements

| Area | Requirement |
|---|---|
| Performance | Web app initial load < 2.5s on 4G; in-room session screen updates < 1s after webhook arrival |
| Availability | 99.5% in V1; webhook ingestion path 99.9% |
| Scalability | 500 clinics, 50k active students, 1M sessions/year by end of Y1 |
| Browser support | Latest 2 versions of Chrome, Edge, Safari, Firefox; tablet (iPad/Android) responsive |
| Localization | en-IN at launch; i18n framework in place for hi-IN, ta-IN, te-IN, kn-IN |
| Accessibility | WCAG 2.1 AA for clinic staff screens |
| Observability | Structured logs, metrics (Prometheus-style), distributed tracing on webhook path |
| Backups | Daily DB snapshots, 30-day retention; PITR for 7 days |
| Data residency | All PHI stored in India region (DPDP) |

---

## 9. Compliance (India DPDP)

- Children's data is **sensitive personal data**. Verifiable parental consent required at intake; consent record is immutable and exportable.
- **Data Principal rights:** access, correction, erasure, grievance — surfaced in Clinic Admin and Super Admin tools; SLAs documented in Privacy Policy.
- **Data Fiduciary obligations:** appoint DPO contact (captured in Tenant settings), publish privacy notice, breach notification workflow (Super Admin alert + 72h reporting template).
- **Encryption:** TLS 1.2+ in transit; AES-256 at rest for PHI fields; field-level encryption for medical history and diagnoses.
- **Access controls:** least-privilege defaults; PHI access events logged.
- **Retention:** active student data retained for duration of treatment + statutory minimum; closed-plan data retained per clinic policy with default 7 years; configurable per tenant.
- **Vendor sub-processors:** maintained list, BAAs with cloud/email/SMS providers.

---

## 10. Acceptance Criteria for V1 (Definition of Done)

V1 ships when ALL of the following are true:
1. Super Admin can onboard a clinic, assign a plan, and invite the first Clinic Admin via email + OTP.
2. Clinic Admin can create departments, sensory rooms (with API keys), and invite Doctor/Therapist/Staff users with permission overrides.
3. Staff can complete a Student profile + medical history + consent in one sitting.
4. Doctor can record an Initial Assessment and build a Treatment Plan that respects the < 20 min/session rule.
5. Therapist can run a session in the sensory room; embedded web games launch in-app, write scored results successfully; results render live; session completes with notes.
6. Per-student dashboard shows accurate trend over ≥ 4 sessions of test data.
7. Doctor can run a periodic review, see rule-based recommendations with rule citations, and modify the plan with versioning + audit trail.
8. Email notifications fire for invites, OTPs, upcoming/missed sessions, and plan expiry.
9. Audit log captures all PHI access and plan changes.
10. End-to-end test suite covers the happy path + 5 critical error paths (in-app game result-write retry/offline buffer, expired plan, role downgrade, OTP throttling, > 20 min override).
11. DPDP-aligned privacy policy + consent flows in place; data residency confirmed.

---

## 11. Open Questions / Items to Resolve with Clinical Advisors

1. **Final list of 10 categories** and the canonical mapping of milestones per age band (need clinician sign-off).
2. **Custom milestone framework** — define the schema (milestone ID, age band, scoring scale, description) and seed content.
3. **Scoring rubric versioning** — when a rubric changes, how do historical scores compare? Lock to plan version vs. recompute.
4. **Game-suggestion ticket workflow** — define the form/SLA for doctor-submitted game-suggestion tickets to the vendor (triage, accept/reject, build, release).
5. **Multi-doctor coverage** — can multiple doctors co-own one student? **Resolved: yes.** Open sub-questions: define handover workflow, primary-doctor designation (if any), and how review-due notifications are routed when ownership is shared.
6. **Sensory room scheduling** — explicit calendar/booking, or just "next available"? Conflicts?
7. **Therapist substitution** — when assigned therapist is absent, how does coverage work?
8. **Reporting templates** — what does the printable progress report look like? (Needs design partner with a doctor.)
9. **Hardware result schema per game** — each game's `result_schema` needs to be co-designed with the hardware team. Block on hardware spec freeze.
10. **Pricing/Plan tiers** — concrete entitlements per tier (Basic vs. Advanced vs. Enterprise).
11. **SMS/WhatsApp provider** — pick one (e.g., MSG91, Gupshup) for V1 if SMS alerts are enabled.
12. **Branding per tenant** — does the clinic want its logo on staff-facing screens and on PDF reports? (Likely yes; scope as "clinic branding" feature.)

---

## 12. V2+ Backlog (Captured, Not in V1)

- Parent web/mobile portal: child summary, schedule, alerts, reports, consent management.
- Native mobile apps for staff (offline-capable session runner).
- ML-based recommender trained on accumulated session data; doctor-in-the-loop validation.
- Medication management.
- Telehealth/video consultation for doctor reviews.
- Insurance/claims integration.
- Localization to hi-IN, ta-IN, te-IN, kn-IN UI strings.
- External hardware/sensor integration (e.g., instrumented physical equipment) with real-time streaming (WebSocket/MQTT) ingestion for live in-room dashboards — V1 ships in-app web games only.
- Standardized screening tools (ASQ-3, M-CHAT) as optional add-ons.
- ICD-10 diagnosis code support for medical records interoperability.
- White-label / clinic-branded parent reports.
- Public API for clinics to integrate with their EMR/HIS.

---

## 13. Glossary

- **Tenant / Clinic:** A child development center using the platform; isolated data boundary.
- **Sensory Room:** A physical room within a clinic where children play web-based games on a clinic device. A clinic can have many; no hard cap on children per room.
- **Game:** A web-based activity embedded in the application. Belongs to a Category and one or more Sub-Categories; targets specific issues; authored at Beginner/Intermediate/Advanced levels with per-level duration/repetitions/frequency defaults.
- **Treatment Plan:** A versioned prescription of which games (and at what level) a student plays, at what frequency, for how long.
- **Session:** A single in-room visit by a student to play their plan's games for the day. Capped at < 20 min.
- **GameResult:** A scored outcome from one game in one session, written by the in-app game runtime to the platform API.
- **Milestone:** A developmental marker tracked over time; populated by the clinic's custom framework.
- **Recommendation:** A rule-engine-generated suggestion to add/remove games or adjust the plan.
- **OP Number:** Out-Patient registration number used by the clinic.
- **DPDP:** India's Digital Personal Data Protection Act, 2023.

---

*End of PRD v0.3. Treat sections 11 and 12 as living lists; everything else is locked for V1 implementation pending sign-off.*
