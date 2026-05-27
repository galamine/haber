# BE-03: Clinic & Tenant Management API

## What to build

Implement the SuperAdmin-facing clinic CRUD and the ClinicAdmin-facing department and sensory room management. Also expose the SuperAdmin platform dashboard aggregation.

**Packages:** `packages/api`, `packages/db`

### tRPC procedures

Add `packages/api/src/routers/clinic.ts`:

```
// SuperAdmin only
clinic.create          → Clinic           (name, address, contact, timezone)
clinic.list            → { items: Clinic[], total, page, totalPages }
clinic.get             → Clinic
clinic.update          → Clinic
clinic.platformSummary → ClinicSummary[]  (name, createdAt, activeChildren, activeTherapists, sessionsThisMonth)

// ClinicAdmin (scoped to their tenantId from JWT)
clinic.createDepartment   → Department   (name, headUserId?, description)
clinic.listDepartments    → Department[]
clinic.updateDepartment   → Department
clinic.deleteDepartment   → void

clinic.createSensoryRoom   → SensoryRoom  (code, name, departmentId?, equipmentList, status)
clinic.listSensoryRooms    → SensoryRoom[]
clinic.updateSensoryRoom   → SensoryRoom
clinic.toggleRoomStatus    → SensoryRoom  (ACTIVE ↔ MAINTENANCE)

// Game library toggles (ClinicAdmin)
clinic.enableGame          → ClinicGameEnable
clinic.disableGame         → void
clinic.listEnabledGames    → Game[]
```

### Authorization rules

- All `clinic.*` SuperAdmin procedures: require `role === SUPER_ADMIN` (throw `FORBIDDEN` otherwise)
- All ClinicAdmin procedures: require `role === CLINIC_ADMIN` and scope all DB queries to `tenantId` from JWT
- No cross-tenant data leakage: every query filters by `clinicId = ctx.tenantId`

### Shared schemas

Add to `packages/api/src/schemas/`:
- `CreateClinicInput`, `UpdateClinicInput`, `ClinicSchema`
- `CreateDepartmentInput`, `DepartmentSchema`
- `CreateSensoryRoomInput`, `SensoryRoomSchema`

## Acceptance criteria

- [ ] `clinic.create` (SuperAdmin) creates a clinic with all required fields
- [ ] `clinic.platformSummary` returns all clinics with correct aggregates (active children count, active therapist count, sessions this month)
- [ ] `clinic.createDepartment` (ClinicAdmin) creates a department scoped to their clinic
- [ ] `clinic.createSensoryRoom` creates a room; rooms of another clinic are not accessible
- [ ] `clinic.enableGame` / `clinic.disableGame` toggle per-clinic game availability
- [ ] Therapist calling a ClinicAdmin-only procedure receives `FORBIDDEN`
- [ ] SuperAdmin can call `clinic.list` and see all clinics; ClinicAdmin cannot
- [ ] All responses paginated where lists are returned
- [ ] `pnpm check-types` passes

## Blocked by

- BE-01a (Clinic, Department, SensoryRoom models must exist)
