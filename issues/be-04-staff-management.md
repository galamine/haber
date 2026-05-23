# BE-04: Staff Management & Permissions API

## What to build

Implement staff invite, role/permission management, department assignment, and deactivation. Staff are users with role `THERAPIST` or `STAFF`, scoped to a clinic.

**Packages:** `packages/api`, `packages/shared`

### Data model additions (no new migration needed — extends `User` from BE-01a)

Add a `UserPermission` model to store granular permissions per user. Add to the Prisma schema and create a migration:

```prisma
model UserPermission {
  id         String @id @default(uuid())
  userId     String
  permission String // e.g. "child.intake", "session.run", "treatment_plan.modify"

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([userId, permission])
}

model UserDepartmentAssignment {
  userId       String
  departmentId String
  assignedAt   DateTime @default(now())

  @@id([userId, departmentId])
}
```

### tRPC procedures

Add `packages/api/src/router/staff.ts`:

```
staff.invite        (clinicAdmin) → { message: "OTP sent" }
  input: { email, role: THERAPIST | STAFF, permissions: string[], departmentIds: string[] }
  — Creates User with loginEnabled=true, sends OTP invite email via Resend

staff.list          (clinicAdmin) → PaginatedUsers
  — Lists all users in tenant, supports filter by role/department

staff.get           (clinicAdmin) → UserWithPermissions

staff.updatePermissions (clinicAdmin) → UserWithPermissions
  input: { userId, permissions: string[] }

staff.assignDepartments (clinicAdmin) → void
  input: { userId, departmentIds: string[] }

staff.deactivate    (clinicAdmin) → void
  input: { userId }
  — Sets User.loginEnabled = false; does NOT delete

staff.reactivate    (clinicAdmin) → void
  input: { userId }
  — Sets User.loginEnabled = true

staff.updateCredentials (clinicAdmin | self) → User
  input: { userId, credentialsQualifications, credentialsRegistrationNumber }
```

### Permission enforcement helper

Add `hasPermission(ctx, permission: string): boolean` utility to `packages/api/src/trpc.ts` that checks `UserPermission` for the current user. Protected procedures that require granular permissions (e.g., `child.intake`) should use this.

### Shared schemas

Add to `packages/shared/src/schemas/`:
- `InviteStaffInput`, `UpdatePermissionsInput`, `UserWithPermissionsSchema`
- Export `PERMISSIONS` constant: `{ CHILD_INTAKE: "child.intake", SESSION_RUN: "session.run", ... }`

## Acceptance criteria

- [ ] `staff.invite` creates a User with correct role, clinicId, loginEnabled=true, and sends OTP via Resend
- [ ] Invited user can log in via OTP flow (BE-00)
- [ ] `staff.list` returns only users in the ClinicAdmin's clinic (no cross-tenant leakage)
- [ ] `staff.updatePermissions` adds/removes `UserPermission` records; list reflects new state
- [ ] `staff.deactivate` sets `loginEnabled = false`; deactivated user cannot obtain new tokens
- [ ] `staff.reactivate` re-enables login
- [ ] `staff.updateCredentials` persists credential fields on User
- [ ] Therapist calling `staff.invite` receives `FORBIDDEN`
- [ ] `pnpm typecheck` passes

## Blocked by

- BE-03 (Clinic and Department models needed for scoping)
