# HaberApp — Issue Breakdown Overview

26 vertical slices decomposed from the Technical PRD (v1.1). Each issue cuts through all layers (DB schema → API → frontend UI → automated tests → manual QA). Both frontend and backend are included in the same issue to enable end-to-end testing.

**HITL** = human-in-the-loop (requires design review before coding starts)  
**AFK** = away-from-keyboard (fully specced; implement and merge autonomously)

---

## Full Breakdown

| # | File | Title | Type | Blocked by | PRD User Stories |
|---|---|---|---|---|---|
| 001 | [001-auth-reform-otp-roles.md](001-auth-reform-otp-roles.md) | Auth Reform — OTP + Role Expansion | HITL | None | 2–5 |
| 002 | [002-tenant-clinic-subscription.md](002-tenant-clinic-subscription.md) | Tenant, Clinic & Subscription Setup | AFK | 001 | 1, 6–8 |
| 003 | [003-staff-management.md](003-staff-management.md) | Staff Management | AFK | 001, 002 | 12–14 |
| 004 | [004-departments-sensory-rooms.md](004-departments-sensory-rooms.md) | Departments & Sensory Rooms | AFK | 002 | 9–11 |
| 005 | [005-student-intake.md](005-student-intake.md) | Student Intake | AFK | 001, 003 | 15, 16, 18–21 |
| 006 | [006-guardian-consent.md](006-guardian-consent.md) | Guardian Consent | AFK | 005 | 17, 20 |
| 007 | [007-clinical-taxonomy-seeding.md](007-clinical-taxonomy-seeding.md) | Clinical Taxonomy Seeding | AFK | 002 | 65–67 |
| 008 | [008-form1-scaffold-basic-fields.md](008-form1-scaffold-basic-fields.md) | Form 1 — Assessment Scaffold & Basic Fields | AFK | 005, 006, 007 | 22, 24, 25, 76, 77 |
| 009 | [009-form1-milestones-sensory-concerns.md](009-form1-milestones-sensory-concerns.md) | Form 1 — Milestones, Sensory Profile & Functional Concerns | AFK | 008 | 23, 78, 79, 80 |
| 010 | [010-form1-tools-goals-signatures.md](010-form1-tools-goals-signatures.md) | Form 1 — Tools, Goals, Intervention Plan & Signatures | AFK | 009 | 81, 82, 83 |
| 011 | [011-treatment-plan-builder.md](011-treatment-plan-builder.md) | Treatment Plan Builder & Lifecycle | AFK | 010 | 26–31 |
| 012 | [012-treatment-plan-presets.md](012-treatment-plan-presets.md) | Treatment Plan Presets | AFK | 011 | 93–95 |
| 013 | [013-goals-first-class.md](013-goals-first-class.md) | Goals as First-Class Entities | AFK | 011 | 91, 92 |
| 014 | [014-game-library.md](014-game-library.md) | Game Library Management | AFK | 002 | 11, 32 |
| 015 | [015-session-generation-queue.md](015-session-generation-queue.md) | Session Generation & Queue | AFK | 011, 014 | 33–36, 46–48 |
| 016 | [016-scoped-jwt-iframe-protocol.md](016-scoped-jwt-iframe-protocol.md) | Scoped JWT & iframe postMessage Protocol | HITL | 015 | 37–39, 44 |
| 017 | [017-session-watchdog.md](017-session-watchdog.md) | Session Watchdog | AFK | 016 | 40–43 |
| 018 | [018-game-result-ingestion.md](018-game-result-ingestion.md) | Game Result Ingestion | AFK | 016 | 49–52 |
| 019 | [019-form2-followup-assessment.md](019-form2-followup-assessment.md) | Follow-Up Assessment — Form 2 | AFK | 010, 015 | 84–90 |
| 020 | [020-goal-tracking-integration.md](020-goal-tracking-integration.md) | Goal Tracking Integration | AFK | 013, 019 | 85, 91, 92 |
| 021 | [021-notifications-alerts.md](021-notifications-alerts.md) | Notifications & Alerts | AFK | 003, 015 | 62–64 |
| 022 | [022-student-progress-dashboard.md](022-student-progress-dashboard.md) | Student Progress Dashboard | AFK | 010, 011, 015, 020 | 53 |
| 023 | [023-clinic-platform-dashboards.md](023-clinic-platform-dashboards.md) | Clinic & Platform Dashboards | AFK | 002, 015 | 54, 55 |
| 024 | [024-progress-report-export.md](024-progress-report-export.md) | Progress Report Export | AFK | 022 | 56, 57 |
| 025 | [025-recommender.md](025-recommender.md) | Rule-Based Recommender | AFK | 020, 021 | 58–61 |
| 026 | [026-audit-dpdp-compliance.md](026-audit-dpdp-compliance.md) | Audit Logging & DPDP Compliance | AFK | 005, 006 | 72–75, 20, 21 |

---

## Dependency Graph

```
001 (Auth Reform — HITL)
├── 002 (Tenant/Clinic) ─────────────────────── 004 (Depts/Rooms)
│   ├── 003 (Staff)                             014 (Game Library)
│   │   └────────────┐                               │
│   └── 007 (Taxonomies)                             │
│         │          │                               │
│    005 (Intake) ◄──┘                               │
│    └── 006 (Consent)                               │
│         └── 008 (Form 1 — Scaffold)                │
│              └── 009 (Form 1 — Milestones/Sensory) │
│                   └── 010 (Form 1 — Tools/Goals)   │
│                        └── 011 (Plan Builder) ◄────┘
│                             ├── 012 (Presets)
│                             ├── 013 (Goals) ────────┐
│                             └── 015 (Sessions)      │
│                                  ├── 016 (JWT/iframe — HITL)
│                                  │    ├── 017 (Watchdog)
│                                  │    └── 018 (Result Ingestion)
│                                  ├── 019 (Form 2) ◄── 010
│                                  │    └── 020 (Goal Tracking) ◄──┘
│                                  │         ├── 022 (Student Dashboard)
│                                  │         │    └── 024 (Reports)
│                                  │         └── 025 (Recommender)
│                                  ├── 021 (Notifications) ◄── 003
│                                  └── 023 (Clinic/Platform Dashboards) ◄── 002
│
└── 005 → 006 → 026 (Audit/DPDP)
```

---

## Starting Points (no blockers)

Only **001 — Auth Reform** can start immediately. All other issues are transitively blocked by it.
