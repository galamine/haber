# 003 — Staff Management [AFK]

**Type:** AFK  
**PRD User Stories:** 12, 13, 14

## What to build

Clinic Admins can invite staff (Doctor, Therapist, Staff) by email using an OTP-based invite flow. Each staff member gets granular permissions on top of their role defaults (e.g., a senior therapist can have `student.intake` added). Staff can be deactivated without deleting their data. The active user count per role is visible and enforced against the subscription plan limits.

## Acceptance criteria

**Schema / migrations**
- [ ] `StaffPermission` model: `id`, `userId` (FK, unique), `permissions` (JSONB array of strings e.g. `["student.intake", "session.run", "treatment_plan.modify_minor"]`), `createdAt`, `updatedAt`
- [ ] `User.isActive` boolean (default true) — deactivation sets to false without deleting the row
- [ ] `User.invitedByUserId` (nullable FK to User) — tracks who sent the invite
- [ ] `User.departmentIds` (JSONB array of UUIDs) — assigned departments (before `Department` table exists in issue 004, stored as raw IDs)

**API endpoints**
- [ ] `POST /staff/invite` — clinic_admin only: `{ email, role, permissions[], departmentIds[] }` — creates a pending User with `isActive: false`, sends OTP invite email; enforces `max_users_by_role` limit per subscription plan
- [ ] `GET /staff` — clinic_admin only: paginated list of staff in the caller's clinic with role, permissions, active status, department names
- [ ] `GET /staff/:userId` — clinic_admin or self: staff member detail
- [ ] `PATCH /staff/:userId` — clinic_admin only: update role, permissions, departmentIds
- [ ] `POST /staff/:userId/deactivate` — clinic_admin only: sets `isActive: false`; deactivated users cannot authenticate
- [ ] `POST /staff/:userId/reactivate` — clinic_admin only: sets `isActive: true`
- [ ] `GET /staff/capacity` — clinic_admin only: active count per role vs. plan `max_users_by_role` limits
- [ ] Auth middleware rejects deactivated users (`isActive: false`) with 401 `USER_DEACTIVATED`
- [ ] Invite OTP reuses the `OtpRecord` model with `type: 'invite'`; accepting the invite activates the user and sets `isActive: true`

**Frontend**
- [ ] Staff list page (clinic_admin only): table with name, role, permissions count, departments, active status, actions (edit, deactivate, reactivate)
- [ ] "Invite Staff" modal: email input, role selector, permission checkboxes (grouped by resource: student, session, treatment_plan), department multi-select
- [ ] Staff detail/edit page: shows all permissions; inline toggle to add/remove granular permissions
- [ ] Capacity widget at top of staff list: pills showing "Doctors: 3/5", "Therapists: 8/10", "Staff: 2/5"
- [ ] Deactivated staff shown with greyed-out row and "Deactivated" badge

**Tests**
- [ ] Clinic admin invites a new therapist — invite OTP email is sent; user record created with `isActive: false`
- [ ] Invited user enters correct OTP — `isActive` set to true; can now authenticate
- [ ] Inviting a 6th doctor when plan limit is 5 returns 422 `PLAN_LIMIT_EXCEEDED`
- [ ] Deactivated user's JWT is rejected with 401 `USER_DEACTIVATED`
- [ ] Clinic admin from Clinic A cannot list or edit staff from Clinic B (tenant isolation)
- [ ] Senior therapist with `student.intake` permission granted can reach the intake API; without it returns 403

## QA / Manual testing

- [ ] Log in as clinic_admin → navigate to Staff → click "Invite Staff" → enter a new email, select role "Therapist", check "student.intake" permission → send invite
- [ ] Check the invite email → enter the OTP → verify you land on the dashboard with therapist role
- [ ] Back as clinic_admin → open the new staff member → verify `student.intake` is shown in permissions
- [ ] Click "Deactivate" → confirm → try logging in as that therapist → verify you get "User deactivated" error
- [ ] Click "Reactivate" → verify the therapist can log in again
- [ ] Check the capacity widget — verify doctor/therapist/staff counts update correctly

## Blocked by

- Issue 001 — Auth Reform: OTP + Role Expansion
- Issue 002 — Tenant, Clinic & Subscription Setup
