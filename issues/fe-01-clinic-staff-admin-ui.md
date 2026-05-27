# FE-01: Clinic Admin & Staff Management UI

## What to build

Build the ClinicAdmin settings area: department management, sensory room management, staff list with invite, and per-staff permission editing. Also build the SuperAdmin clinic list and onboarding form.

**Package:** `packages/client`

### Routes to add

```
/dashboard/settings/departments        → DepartmentsPage
/dashboard/settings/rooms              → SensoryRoomsPage
/dashboard/settings/staff              → StaffListPage
/dashboard/settings/staff/:id          → StaffDetailPage
/dashboard/settings/staff/invite       → InviteStaffPage
/dashboard/platform/clinics            → ClinicsListPage (SuperAdmin only)
/dashboard/platform/clinics/new        → CreateClinicPage (SuperAdmin only)
```

### Key components

**StaffListPage:**
- Table of staff (name, role, departments, last login, status badge)
- "Invite Staff" button → opens sheet or navigates to invite form
- Deactivate/reactivate toggle per staff row (calls `staff.deactivate` / `staff.reactivate`)

**InviteStaffPage:**
- Form: email, role selector (THERAPIST / STAFF), permission checkboxes (using `PERMISSIONS` constants from shared), department multi-select
- Submit calls `staff.invite`

**StaffDetailPage:**
- Shows staff profile, credentials fields (editable by ClinicAdmin)
- Permission editor: checkbox grid grouped by permission category
- Department assignment multi-select
- "Deactivate" / "Reactivate" button

**DepartmentsPage:**
- List of departments with head therapist and description
- Inline create/edit form
- Delete department (confirmation dialog using `AlertDialog` from ui/)

**SensoryRoomsPage:**
- Cards for each room with code, status badge (ACTIVE / MAINTENANCE), and equipment list
- Toggle status button per room
- Create room sheet form

**ClinicsListPage (SuperAdmin):**
- Table: clinic name, creation date, active children, active therapists, sessions this month
- Links to clinic detail (no edit in V1)

### tRPC hooks used

- `api.staff.list.useQuery()`
- `api.staff.invite.useMutation()`
- `api.staff.updatePermissions.useMutation()`
- `api.staff.deactivate.useMutation()`
- `api.clinic.createDepartment.useMutation()`
- `api.clinic.listDepartments.useQuery()`
- `api.clinic.createSensoryRoom.useMutation()`
- `api.clinic.listSensoryRooms.useQuery()`
- `api.clinic.list.useQuery()` (SuperAdmin)
- `api.clinic.create.useMutation()` (SuperAdmin)

## Acceptance criteria

- [ ] ClinicAdmin can view staff list, invite a new staff member, and see the invitee in the list
- [ ] ClinicAdmin can toggle staff permissions; changes persist on page refresh
- [ ] ClinicAdmin can deactivate/reactivate a staff member
- [ ] ClinicAdmin can create, view, and delete departments
- [ ] ClinicAdmin can create sensory rooms and toggle their status
- [ ] SuperAdmin sees the clinic list with correct aggregate counts
- [ ] Therapist navigating to `/dashboard/settings/staff` is redirected (no access)
- [ ] All forms use react-hook-form + Zod (same pattern as existing login form)
- [ ] `pnpm --filter client typecheck` passes

## Blocked by

- BE-03 (Clinic & department API)
- BE-04 (Staff management API)
- FE-00 (App shell must exist for navigation)
