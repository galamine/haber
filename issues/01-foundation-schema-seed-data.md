# 01-foundation-schema-seed-data

## What to build

Set up the core Prisma schema for all clinical entities (Tenant, Student, Guardian, Session, TreatmentPlan, Assessment, Game, Milestone, Notification, AuditLog) and seed the global canonical data (10 game categories, milestone framework). This is the foundation that all other slices depend on.

## Acceptance criteria

- [ ] Prisma schema defines all tables: Tenant, Student, Guardian, ConsentRecord, Assessment, TreatmentPlan, TreatmentPlanVersion, Session, SessionGameAssignment, Game, GameVersion, GameCategory, Milestone, Notification, AuditLog, RefreshToken, Invitation
- [ ] UUID v4 primary keys on all tables
- [ ] Soft delete (`deleted_at`) on Student, Guardian
- [ ] `is_active` flag on TreatmentPlanVersion, StudentAssessment
- [ ] Tenant isolation enforced via `tenant_id` on all clinical entities
- [ ] Seed data: 10 global game categories (Gross Motor, Fine Motor, Sensory Integration, Visual-Motor, Cognitive, Speech & Language, Social, Self-Care, Balance, Coordination)
- [ ] Seed data: canonical milestone framework (id, framework_id='canonical', age_band_min/max_months, scoring_scale_min/max, description, parent_milestone_id)
- [ ] Database migrations run successfully
- [ ] Unit tests for seed data integrity (category count, milestone hierarchy)

## Blocked by

None - can start immediately

## User stories

(Foundation - enables all subsequent user stories)