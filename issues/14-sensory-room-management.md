# 14-sensory-room-management

## What to build

Sensory room CRUD with equipment list and status tracking, room-level enable/disable per clinic.

## Acceptance criteria

- [ ] `POST /v1/rooms` — create room: name, code, optional department, equipment list (JSON array), status (active/maintenance)
- [ ] `GET /v1/rooms` — list rooms with status, department, equipment
- [ ] `PATCH /v1/rooms/:id` — update room details, status
- [ ] `DELETE /v1/rooms/:id` — soft delete (sets `deleted_at`)
- [ ] Clinic Admin can toggle which games in the central library are enabled/disabled for their clinic
- [ ] `GET /v1/clinics/:id/enabled-games` — list games enabled for clinic
- [ ] `PATCH /v1/clinics/:id/enabled-games` — update enabled games list
- [ ] Prisma: Room model with equipment JSON, tenant relation; ClinicGameEnabled model
- [ ] Frontend: Room management page with status toggle, maintenance mode, equipment editor
- [ ] Integration tests: room CRUD, status change triggers availability update

## Blocked by

- [02-tenant-subscription-management.md](./02-tenant-subscription-management.md)

## User stories

- #10: Clinic Admin creates sensory room with name/code, optional department, equipment list, status (active/maintenance)
- #11: Clinic Admin toggles which games in central library are enabled/disabled for their clinic

## QA checklist

- [ ] Room status change reflects immediately in session scheduling
- [ ] Maintenance rooms cannot be assigned in new sessions
- [ ] Equipment list is editable and persists
- [ ] Clinic-enabled games filter is respected in game library browser
- [ ] Room code is unique per clinic