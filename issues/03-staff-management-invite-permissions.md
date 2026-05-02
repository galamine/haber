# 03-staff-management-invite-permissions

## What to build

Staff lifecycle: invite by email with OTP, role and granular permission assignment, department assignment, deactivation without deletion. Includes all API routes, services, and frontend admin panel.

## Acceptance criteria

- [ ] `POST /v1/users/invite` — sends invite email with OTP code (6-digit, 10-min expiry)
- [ ] `POST /v1/users/invite/accept` — verify OTP, complete profile, activate account
- [ ] `GET /v1/users` — paginated list, filterable by role, department, status
- [ ] `PATCH /v1/users/:id` — update role, permissions, department assignment
- [ ] `POST /v1/users/:id/deactivate` — soft deactivate (sets `status=inactive`, prevents login)
- [ ] `StaffService` with permission override support (e.g., senior therapist gets `student.intake` + `treatment_plan.modify_minor`)
- [ ] `GET /v1/clinics/:id/usage` — returns active user count per role against plan limits
- [ ] Role enum: SUPER_ADMIN, CLINIC_ADMIN, DOCTOR, THERAPIST, STAFF
- [ ] Permission flags: `student.intake`, `session.run`, `treatment_plan.modify`, etc. stored as JSON array
- [ ] Department CRUD: `POST /v1/departments`, `GET /v1/departments`
- [ ] Frontend: Staff list page, invite modal, role/permission editor, department selector
- [ ] Integration tests: invite flow, permission override, deactivation preserves audit trail

## Blocked by

- [02-tenant-subscription-management.md](./02-tenant-subscription-management.md)

## User stories

- #2: Clinic Admin receives invite email with OTP, completes profile, signs in
- #12: Clinic Admin invites user by email, assigns role, sets granular permissions, assigns departments, deactivates
- #13: Clinic Admin grants senior therapist additional permissions beyond role defaults
- #14: Clinic Admin sees count of active users per role against plan limits