# FE-01: Clinic Admin & Staff Management UI — Implementation Plan

## Context

This implements the ClinicAdmin settings area and SuperAdmin clinic list for the Haber platform. The backend routers (`staff.*`, `clinic.*`) are already built (BE-03, BE-04). The frontend currently only has `/dashboard` under `_authenticated/`. These pages extend the existing `AppShell` (sidebar + outlet layout) and follow the same `createFileRoute` + tRPC `useQuery`/`useMutation` pattern seen in `dashboard.tsx` and `login.tsx`.

Design source: stitch exports in `stitch_haber/` (staff_list_clinic_admin, staff_detail_permissions, department_management, sensory_room_management, superadmin_clinic_overview). Use `stitch-to-react` and `frontend-design` skills when converting. Icons: **lucide-react** (not Material Symbols — consistent with existing AppShell).

---

## Files to Create

```
apps/web/src/routes/_authenticated/
├── settings/
│   ├── departments.tsx        → /settings/departments
│   ├── rooms.tsx              → /settings/rooms
│   └── staff/
│       ├── index.tsx          → /settings/staff
│       ├── invite.tsx         → /settings/staff/invite
│       └── $staffId.tsx       → /settings/staff/$staffId
└── platform/
    └── clinics/
        ├── index.tsx          → /platform/clinics
        └── new.tsx            → /platform/clinics/new
```

Also update: `apps/web/src/components/shell/AppShell.tsx` — wire real `to:` paths in `NAV_ITEMS`.

---

## Shared Conventions

| Concern | Pattern |
|---|---|
| Route declaration | `createFileRoute("/_authenticated/settings/staff")({ component: Foo })` |
| Query | `useQuery(trpc.staff.list.queryOptions({ page, pageSize: 20 }))` |
| Mutation | `useMutation(trpc.staff.invite.mutationOptions({ onSuccess: () => toast.success(...) }))` |
| Form | `useForm<z.infer<typeof Schema>>({ resolver: zodResolver(Schema) })` + `<Form><FormField>` from `@haber-final/ui/components/form` |
| SuperAdmin guard | `beforeLoad: ({ context }) => { if (context.auth.role !== 'SUPER_ADMIN') throw redirect({ to: '/dashboard' }) }` |
| Imports — icons | `lucide-react` |
| Imports — UI | `@haber-final/ui/components/*` |
| Imports — schemas/constants | `@haber-final/api` (PERMISSIONS, InviteStaffInput, CreateDepartmentInput, etc.) |
| Toast | `sonner` via `toast.success` / `toast.error` |
| Query invalidation after mutation | `queryClient.invalidateQueries(...)` or `refetch()` |

**Design tokens to use** (already in globals.css):
`bg-surface-container-lowest`, `border-outline-variant`, `text-on-surface`, `text-on-surface-variant`, `bg-brown-600 text-on-primary hover:bg-brown-700`, `text-success`, `text-danger`, `bg-error-container`

---

## Page 1 — StaffListPage

**File:** `settings/staff/index.tsx`
**Stitch:** `stitch_haber/staff_list_clinic_admin/`

### Layout
Page header (title + "Invite Staff" button) → table card → pagination footer.

### Sub-components

**`StaffRow`**
- Avatar: `<Avatar>` with image src; fallback = initials derived from name
- Name + email in a stacked sub-row
- Role text column
- Department chips: one `<Badge variant="outline">` per department name
- Status badge: green rounded-full pill "Active" (`text-success bg-green-50 border-green-200`) or gray "Inactive"
- Full row is clickable → `router.navigate({ to: '/settings/staff/$staffId', params: { staffId: row.id } })`

**`StaffListSkeleton`**
- 5 `<Skeleton>` rows matching table-row height

**`StaffListPage`** (root component)
- State: `page` (number, default 1)
- `useQuery(trpc.staff.list.queryOptions({ page, pageSize: 20 }))`
- Show `<StaffListSkeleton>` while `isLoading`
- Table wrapper: `bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden`
- Column header row: `grid grid-cols-[1fr_1.5fr_2fr_1fr_1fr] gap-md p-md` with muted `text-on-surface-variant` labels
- Body: `divide-y divide-outline-variant` — map `data.items` to `<StaffRow>`
- Empty state: centered `Users` icon + "No staff members yet."
- Pagination: `<` prev / numbered pages / `>` next using `data.totalPages` + `data.page`
- "Invite Staff" button → `router.navigate({ to: '/settings/staff/invite' })`

### tRPC hooks
- `trpc.staff.list.queryOptions({ page, pageSize: 20 })`

---

## Page 2 — InviteStaffPage

**File:** `settings/staff/invite.tsx`
**Stitch:** none — build from issue spec + design system

### Zod schema
Reuse `InviteStaffInput` from `@haber-final/api/src/schemas/staff`:
```ts
// email, role: "THERAPIST"|"STAFF", permissions: string[], departmentIds: string[]
```

### Layout
Back button + page title → single centered card form.

### Form fields
1. **Email** — `<FormField>` + `<Input type="email" placeholder="staff@clinic.com">`
2. **Role** — `<FormField>` + `<Select>` with options: `THERAPIST` / `STAFF`
3. **Permissions** — checkbox group (no `<FormField>` wrapper needed; use `Controller`):
   - Iterate `Object.entries(PERMISSIONS)` from `@haber-final/api`:
     - `CHILD_INTAKE` → label "Child Intake"
     - `SESSION_RUN` → label "Run Sessions"
     - `TREATMENT_PLAN_MODIFY` → label "Modify Treatment Plans"
   - Each `<Checkbox>` toggles the permission string in/out of the `permissions` array field
4. **Departments** — multi-select checkboxes:
   - `useQuery(trpc.clinic.listDepartments.queryOptions())` for options
   - Checkboxes toggle department IDs in/out of `departmentIds` field

### Actions
- Submit → `useMutation(trpc.staff.invite.mutationOptions())` → `toast.success("Invite sent")` → navigate to `/settings/staff`
- Cancel → navigate back to `/settings/staff`

### tRPC hooks
- `trpc.clinic.listDepartments.queryOptions()`
- `trpc.staff.invite.mutationOptions()`

---

## Page 3 — StaffDetailPage

**File:** `settings/staff/$staffId.tsx`
**Stitch:** `stitch_haber/staff_detail_permissions/`

### Layout
Bento 3-column grid (`xl:grid-cols-3 gap-lg`). Left col (span 1): profile card + department card + danger zone card. Right col (span 2): permissions editor card.

### Sub-components

**`ProfileCard`**
- Large avatar `w-32 h-32 rounded-full` with green active-dot overlay (if `loginEnabled`)
- Staff name (`font-display-sm`), role (`text-primary font-medium`)
- Info rows (lucide icons + text): email, `credentialsRegistrationNumber` if present, `createdAt` formatted as "Joined MMM YYYY"
- Card: `bg-surface-container-lowest rounded-xl p-lg border`

**`DepartmentAssignmentCard`**
- `useQuery(trpc.clinic.listDepartments.queryOptions())` for all available depts
- Selected IDs initialized from `staff.departmentAssignments.map(a => a.departmentId)`
- Local state: `selectedDeptIds: string[]`
- UI: selected depts shown as removable chips (`bg-brown-100 text-brown-800 rounded-md`); unselected depts in a `<Select>`/dropdown to add
- "Save" button → `useMutation(trpc.staff.assignDepartments.mutationOptions())`

**`DangerZoneCard`**
- `bg-error-container/20 border-error-container rounded-xl p-lg`
- If `staff.loginEnabled === true`: red "Deactivate Staff Member" button → `trpc.staff.deactivate.mutationOptions()` with `AlertDialog` confirmation
- If `staff.loginEnabled === false`: green "Reactivate" button → `trpc.staff.reactivate.mutationOptions()`
- After mutation: invalidate `trpc.staff.get` query + `toast.success`

**`PermissionsEditor`** (right column, `xl:col-span-2`)
- Card: `bg-surface-container-lowest rounded-xl p-lg border`
- Header: "Access & Permissions" title + description
- Local state: `activePerms: Set<string>` initialized from `staff.permissions.map(p => p.permission)`
- Permission checkboxes (all 3 PERMISSIONS constants) rendered in a styled group:
  - Custom checkbox UI matching stitch: `w-5 h-5 border-2 border-brown-300 rounded peer-checked:bg-primary`
  - Label with permission name + short description
- Footer: "Discard Changes" (reset `activePerms` to original) + "Save Permissions" → `trpc.staff.updatePermissions.mutationOptions({ userId, permissions: [...activePerms] })`

**`StaffDetailPage`** (root)
- `staffId` from `Route.useParams()`
- `useQuery(trpc.staff.get.queryOptions({ userId: staffId }))`
- Breadcrumb: "Staff" clickable link → `/settings/staff` + chevron + staff name
- Skeleton: profile card skeleton + permissions skeleton while loading
- Error state: "Staff member not found" with back link

### tRPC hooks
- `trpc.staff.get.queryOptions({ userId })`
- `trpc.staff.updatePermissions.mutationOptions()`
- `trpc.staff.assignDepartments.mutationOptions()`
- `trpc.staff.deactivate.mutationOptions()`
- `trpc.staff.reactivate.mutationOptions()`
- `trpc.clinic.listDepartments.queryOptions()`

---

## Page 4 — DepartmentsPage

**File:** `settings/departments.tsx`
**Stitch:** `stitch_haber/department_management/`

### Layout
Page header + "Add Department" button → 3-column responsive bento grid of department cards.

### Sub-components

**`DepartmentCard`** (props: `dept`, `onEdit`, `onDelete`)
- `bg-surface-container-lowest rounded-xl p-lg border border-outline-variant group relative`
- Hover (via Tailwind `group`): reveals edit (`Pencil` icon) + delete (`Trash2` icon) buttons in top-right corner
- Icon: `Building2` (lucide) in `bg-brown-50 w-12 h-12 rounded-lg`
- Name (`font-text-xl font-medium`) + 2-line clamped description (`line-clamp-2`)
- Footer (border-top): head therapist name (or "Unassigned") with small avatar + staff count

**`DepartmentFormSheet`** (shared for create & edit; accepts `mode: "create"|"edit"`, `initial?: Department`)
- `<Sheet>` from `@haber-final/ui/components/sheet`
- Fields:
  - name: `<Input>`
  - description: `<Textarea>`
  - headUserId: `<Select>` of therapist staff — `useQuery(trpc.staff.list.queryOptions({ role: "THERAPIST", pageSize: 100 }))`
- Zod: `CreateDepartmentInput` (create) / `UpdateDepartmentInput` (edit)
- Submit: `trpc.clinic.createDepartment` or `trpc.clinic.updateDepartment` → `toast.success` → close sheet + invalidate list

**`DeleteDepartmentDialog`** (uses `<AlertDialog>` from UI)
- "This will permanently delete [dept name]." confirmation
- Confirm → `trpc.clinic.deleteDepartment.mutationOptions({ id })` → `toast.success` → invalidate list

**`DepartmentsPage`** (root)
- State: `sheetOpen`, `editTarget: Department | null`, `deleteTarget: Department | null`
- `useQuery(trpc.clinic.listDepartments.queryOptions())`
- Skeleton: 3 card skeletons while loading
- Empty state: "No departments yet. Add one to get started."
- Grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md`

### tRPC hooks
- `trpc.clinic.listDepartments.queryOptions()`
- `trpc.clinic.createDepartment.mutationOptions()`
- `trpc.clinic.updateDepartment.mutationOptions()`
- `trpc.clinic.deleteDepartment.mutationOptions()`
- `trpc.staff.list.queryOptions({ role: "THERAPIST", pageSize: 100 })` (inside sheet)

---

## Page 5 — SensoryRoomsPage

**File:** `settings/rooms.tsx`
**Stitch:** `stitch_haber/sensory_room_management/`

### Layout
Page header + "Add Room" button → 3-column responsive bento grid of room cards.

### Sub-components

**`RoomStatusBadge`** (props: `status: "ACTIVE" | "MAINTENANCE"`)
- ACTIVE: `bg-green-50 text-green-700 border-green-200` + `CheckCircle` icon
- MAINTENANCE: `bg-amber-50 text-amber-700 border-amber-200` + `Wrench` icon
- Rounded-full pill with icon + text

**`RoomCard`** (props: `room`, `onEdit`, `onToggle`)
- `bg-surface rounded-xl p-lg border border-outline-variant hover:shadow-md transition-shadow`
- Header: code badge (`bg-primary-container text-on-primary-container rounded px-2 py-1 text-xs`) + name + `<RoomStatusBadge>`
- Equipment section (`equipmentList` is `string[]` from JSON): `<ul>` with each item as `<li>` with `Package` lucide icon
- Footer: edit (`Pencil`) icon button + toggle status (`Power`) icon button
- Toggle → `trpc.clinic.toggleRoomStatus.mutationOptions({ id: room.id })` → invalidate list

**`RoomFormSheet`** (create & edit)
- `<Sheet>` with fields:
  - code: `<Input>` (e.g. "RM-101")
  - name: `<Input>`
  - status: `<Select>` with ACTIVE / MAINTENANCE
  - equipmentList: dynamic tag-input — `string[]` state, add via text input + Enter, remove via × badge
- Zod: `CreateSensoryRoomInput` / `UpdateSensoryRoomInput`
- Submit: `trpc.clinic.createSensoryRoom` or `trpc.clinic.updateSensoryRoom` → close + invalidate

**`SensoryRoomsPage`** (root)
- State: `sheetOpen`, `editTarget: SensoryRoom | null`
- `useQuery(trpc.clinic.listSensoryRooms.queryOptions())`
- Skeleton: 3 card skeletons
- Empty state: "No sensory rooms configured yet."
- Grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg`

### tRPC hooks
- `trpc.clinic.listSensoryRooms.queryOptions()`
- `trpc.clinic.createSensoryRoom.mutationOptions()`
- `trpc.clinic.updateSensoryRoom.mutationOptions()`
- `trpc.clinic.toggleRoomStatus.mutationOptions()`

---

## Page 6 — ClinicsListPage (SuperAdmin)

**File:** `platform/clinics/index.tsx`
**Stitch:** `stitch_haber/superadmin_clinic_overview/`

### Guard
```ts
beforeLoad: ({ context }) => {
  if (context.auth.role !== 'SUPER_ADMIN') throw redirect({ to: '/dashboard' })
}
```

### Layout
Page header ("All Clinics" + "Register Clinic" button → `/platform/clinics/new`) → table card.

### Sub-components

**`ClinicRow`** (props: `clinic`)
- Name (bold), address, contact name + email
- Created date formatted as "MMM D, YYYY"
- (No edit in V1 — row is non-clickable or placeholder link)

**`ClinicsListPage`** (root)
- `useQuery(trpc.clinic.platformSummary.queryOptions())` — returns array of clinic summaries
- Table: `bg-surface-container-lowest rounded-xl border border-outline-variant`
- Column headers: Name, Address, Contact, Created
- Skeleton while loading; empty state "No clinics registered."

### tRPC hooks
- `trpc.clinic.platformSummary.queryOptions()`

---

## Page 7 — NewClinicPage (SuperAdmin)

**File:** `platform/clinics/new.tsx`
**Stitch:** none — build from `CreateClinicInput` schema + design system

### Guard
Same SuperAdmin `beforeLoad` as ClinicsListPage.

### Zod schema
`CreateClinicInput` from `@haber-final/api/src/schemas/clinic`:
```ts
// name, address, contactName, contactPhone, contactEmail, timezone (optional)
```

### Layout
Back button + "Register New Clinic" title → centered card form.

### Form fields
1. Clinic Name — `<Input>`
2. Address — `<Textarea>`
3. Contact Name — `<Input>`
4. Contact Phone — `<Input type="tel">`
5. Contact Email — `<Input type="email">`
6. Timezone — `<Input placeholder="Asia/Kolkata">` (optional)

### Actions
- Submit → `trpc.clinic.create.mutationOptions()` → `toast.success("Clinic registered")` → navigate to `/platform/clinics`
- Cancel → navigate back

### tRPC hooks
- `trpc.clinic.create.mutationOptions()`

---

## AppShell Update

`apps/web/src/components/shell/AppShell.tsx` — update `NAV_ITEMS` `to:` values:

```ts
{ label: "Staff",            to: "/settings/staff",       icon: <Users />,   roles: ["CLINIC_ADMIN","SUPER_ADMIN"] },
{ label: "Clinic Settings",  to: "/settings/departments", icon: <Settings />,roles: ["CLINIC_ADMIN","SUPER_ADMIN"] },
{ label: "Sensory Rooms",    to: "/settings/rooms",       icon: <Building2 />,roles: ["CLINIC_ADMIN","SUPER_ADMIN"] },
{ label: "Platform Overview",to: "/platform/clinics",     icon: <Shield />,  roles: ["SUPER_ADMIN"] },
```

---

## Verification Checklist

1. `pnpm check-types` — zero errors
2. As CLINIC_ADMIN: `/settings/staff` → table renders with skeleton → data loads
3. Click "Invite Staff" → complete form → submit → invitee appears in list
4. Click staff row → detail page → toggle permission → save → refresh → permission persists
5. `/settings/departments` → create dept → edit dept → delete with `AlertDialog` confirmation
6. `/settings/rooms` → create room → toggle status → badge updates instantly
7. As SUPER_ADMIN: `/platform/clinics` → clinic table renders
8. As THERAPIST: navigate to `/platform/clinics` → redirected to `/dashboard`
9. All loading states show skeletons; all errors show `toast.error`
