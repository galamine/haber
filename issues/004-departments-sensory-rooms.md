# 004 — Departments & Sensory Rooms [AFK]

**Type:** AFK  
**PRD User Stories:** 9, 10, 11

## What to build

Clinic Admins can create Departments (logical groupings of staff) and Sensory Rooms (physical spaces where therapy sessions happen). Rooms have equipment lists and maintenance status. Game library entries can be enabled or disabled per clinic, controlling what doctors can prescribe in treatment plans.

## Acceptance criteria

**Schema / migrations**
- [ ] `Department` model: `id`, `tenantId` (FK to Clinic), `name`, `headUserId` (nullable FK to User), `description` (nullable), `createdAt`, `updatedAt`
- [ ] `SensoryRoom` model: `id`, `tenantId` (FK to Clinic), `name`, `code` (short identifier, unique per clinic), `departmentId` (nullable FK), `equipmentList` (JSONB array of strings), `status` enum (`active` | `maintenance`), `createdAt`, `updatedAt`
- [ ] `ClinicGameToggle` model: `id`, `tenantId` (FK), `gameId` (FK to Game — references the table created in issue 014), `enabled` boolean (default true), `updatedAt` — allows clinic-level enable/disable of global games

**API endpoints**
- [ ] `POST /departments` — clinic_admin only: create department (name, headUserId, description)
- [ ] `GET /departments` — clinic_admin, doctor, therapist: list departments in caller's clinic
- [ ] `PATCH /departments/:id` — clinic_admin only: update name, head, description
- [ ] `DELETE /departments/:id` — clinic_admin only: only if no active rooms assigned
- [ ] `POST /sensory-rooms` — clinic_admin only: create room (name, code, departmentId, equipmentList, status)
- [ ] `GET /sensory-rooms` — clinic_admin, therapist: list rooms with status filter
- [ ] `GET /sensory-rooms/:id` — room detail
- [ ] `PATCH /sensory-rooms/:id` — clinic_admin only: update room fields
- [ ] `DELETE /sensory-rooms/:id` — clinic_admin only: only if no active sessions booked
- [ ] `PATCH /clinic/game-toggles` — clinic_admin only: `{ gameId, enabled }` — enable/disable a game for this clinic
- [ ] `GET /clinic/game-toggles` — list all games with per-clinic enabled/disabled status

**Frontend**
- [ ] "Departments" tab on clinic setup page: list with head staff name and description; add/edit inline
- [ ] "Sensory Rooms" tab on clinic setup page: table with name, code, department, equipment count, status badge (green/yellow); add/edit/delete actions
- [ ] Room create/edit form: name, code, department dropdown, equipment list (tag input), status toggle
- [ ] "Game Library" admin page: table of all global games with per-row enable/disable toggle per clinic
- [ ] Rooms with `status: maintenance` shown with yellow badge and excluded from session booking dropdowns

**Tests**
- [ ] Clinic admin creates a department → it appears in department list scoped to their tenant
- [ ] Clinic admin creates a sensory room → it appears in room list with correct status
- [ ] Deleting a department with assigned rooms returns 422 `DEPARTMENT_HAS_ROOMS`
- [ ] Disabling a game at clinic level → game is absent from the game picker when building a treatment plan
- [ ] Staff from a different clinic cannot list this clinic's rooms (tenant isolation)
- [ ] Room in `maintenance` status does not appear in the session room assignment dropdown

## QA / Manual testing

- [ ] Log in as clinic_admin → navigate to Clinic Setup → Departments tab → click "Add Department" → enter name "OT Wing", select a head therapist → save → verify it appears in the list
- [ ] Navigate to Sensory Rooms tab → click "Add Room" → fill in name "Room A", code "RM-A", select department "OT Wing", add equipment "Swing, Trampoline", status "Active" → save
- [ ] Set Room A to "Maintenance" → navigate to a session booking → verify Room A does not appear in the room dropdown
- [ ] Navigate to Game Library admin page → toggle off "Balance Beam Game" → build a treatment plan as a doctor → verify the game is absent from the game picker

## Blocked by

- Issue 002 — Tenant, Clinic & Subscription Setup
