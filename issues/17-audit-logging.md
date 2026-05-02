# 17-audit-logging

## What to build

Comprehensive audit logging: every sign-in, role change, plan modification, and PHI access logged with actor, timestamp, IP, and entity. Entity-specific history tables (StudentHistory, PlanHistory, AssessmentHistory, etc.) — not a generic polymorphic audit log.

## Acceptance criteria

- [ ] `GET /v1/audit/students/:id` — returns student history (all changes to student record)
- [ ] `GET /v1/audit/treatment-plans/:id` — returns plan history (all versions, modifications)
- [ ] `GET /v1/audit/assessments/:id` — returns assessment history (all versions)
- [ ] `GET /v1/audit/sessions/:id` — returns session history (start, stop, attendance, notes)
- [ ] Audit entry format: `{ id, actor_id, actor_role, timestamp, ip_address, entity_type, entity_id, action, changes: { field, old_value, new_value }[] }`
- [ ] PHI access logging: every GET on Student, Assessment, TreatmentPlan with student context logs access
- [ ] Sign-in logging: every successful/failed authentication event logged
- [ ] Role change logging: every user role/permission change logged
- [ ] AuditService appends to entity-specific history tables (not generic audit log table)
- [ ] Prisma: StudentHistory, PlanHistory, AssessmentHistory, SessionHistory, UserHistory models
- [ ] Frontend: Admin audit viewer page with filters (entity type, actor, date range)
- [ ] Integration tests: audit entries created on all specified actions, history tables grow correctly

## Blocked by

- [01-foundation-schema-seed-data.md](./01-foundation-schema-seed-data.md)

## User stories

- #72: Super Admin or Clinic Admin sees every sign-in, role change, plan modification, and PHI access logged with actor, timestamp, IP, and entity

## QA checklist

- [ ] All sign-in events (success and failure) are logged
- [ ] All role and permission changes are logged with old and new values
- [ ] All plan modifications create history entries
- [ ] PHI access (student records, assessments) is logged
- [ ] Audit entries are immutable (no UPDATE/DELETE operations)
- [ ] Actor can be traced to exact user and role at time of action
- [ ] IP address is captured for all logged events
- [ ] Audit viewer shows chronological history with filtering