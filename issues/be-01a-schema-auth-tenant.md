# BE-01a: Schema Migration — Auth & Tenant Domain

## What to build

Extend the Prisma schema with Clinic, Department, and SensoryRoom models and update `User` to support multi-tenancy and role-based access. This is the first of four sequential schema migrations; all subsequent schema and feature work depends on it.

**Packages:** `packages/api`

### New Prisma models

```prisma
model Clinic {
  id          String       @id @default(uuid())
  name        String
  address     String
  contactName String
  contactPhone String
  contactEmail String
  timezone    String       @default("Asia/Kolkata")
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  deletedAt   DateTime?

  departments  Department[]
  sensoryRooms SensoryRoom[]
  users        User[]
}

model Department {
  id          String   @id @default(uuid())
  clinicId    String
  name        String
  headUserId  String?
  description String?
  createdAt   DateTime @default(now())

  clinic Department @relation(fields: [clinicId], references: [id])
}

model SensoryRoom {
  id            String         @id @default(uuid())
  clinicId      String
  departmentId  String?
  code          String
  name          String
  equipmentList Json           @default("[]")
  status        RoomStatus     @default(ACTIVE)
  createdAt     DateTime       @default(now())

  clinic Clinic @relation(fields: [clinicId], references: [id])
}

enum RoomStatus {
  ACTIVE
  MAINTENANCE
}

enum UserRole {
  SUPER_ADMIN
  CLINIC_ADMIN
  THERAPIST
  STAFF
}
```

### Updated `User` model

Add: `clinicId String?`, `role UserRole @default(STAFF)`, `loginEnabled Boolean @default(true)`, `credentialsQualifications String?`, `credentialsRegistrationNumber String?`

Remove: `password String` (breaking change — drop column after removing from auth flow in BE-00)

### Migration

Generate and apply a Prisma migration: `pnpm --filter api db:migrate -- --name auth_tenant_domain`

## Acceptance criteria

- [ ] `Clinic`, `Department`, `SensoryRoom` tables created in the database
- [ ] `User` table has `clinicId`, `role`, `loginEnabled`, `credentialsQualifications`, `credentialsRegistrationNumber` columns
- [ ] `User.password` column removed (migration is destructive — only safe after BE-00 removes password-based login)
- [ ] `UserRole` and `RoomStatus` enums created
- [ ] Prisma client regenerated (`pnpm --filter api db:generate`)
- [ ] `pnpm typecheck` passes across all packages
- [ ] Migration file committed to `packages/api/prisma/migrations/`

## Blocked by

- BE-00 (must remove password-based auth before dropping the `password` column)
