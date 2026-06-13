# Plan: BE-01a — Schema Migration, Auth & Tenant Domain

## Context

BE-00 is complete. The `auth.prisma` file already exists with a partial implementation:
`UserRole` enum, a minimal `Clinic` model (id, name, users only), and the full `User`, `Session`, `Otp` models. The `password` column is already gone. This task extends the schema with the remaining tenant-domain models (`Department`, `SensoryRoom`) and fills out `Clinic` with its full set of fields. `db:push` will be used (no migrations directory).

## Decisions

- **ID format**: `cuid()` for all new models, consistent with existing models.
- **Apply changes**: `pnpm db:push` then `pnpm db:generate`.

## Exact Changes — `packages/db/prisma/schema/auth.prisma`

### 1. Add `RoomStatus` enum (new)

```prisma
enum RoomStatus {
  ACTIVE
  MAINTENANCE
}
```

### 2. Expand the existing `Clinic` model

Replace the current minimal model with:

```prisma
model Clinic {
  id           String      @id @default(cuid())
  name         String
  address      String
  contactName  String
  contactPhone String
  contactEmail String
  timezone     String      @default("Asia/Kolkata")
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  deletedAt    DateTime?

  departments  Department[]
  sensoryRooms SensoryRoom[]
  users        User[]

  @@map("clinic")
}
```

### 3. Add `Department` model (new)

```prisma
model Department {
  id          String   @id @default(cuid())
  clinicId    String
  name        String
  headUserId  String?
  description String?
  createdAt   DateTime @default(now())

  clinic Clinic @relation(fields: [clinicId], references: [id])

  @@map("department")
}
```

> Note: The issue spec has a typo (`clinic Department @relation`) — corrected to `clinic Clinic @relation`.

### 4. Add `SensoryRoom` model (new)

```prisma
model SensoryRoom {
  id            String     @id @default(cuid())
  clinicId      String
  departmentId  String?
  code          String
  name          String
  equipmentList Json       @default("[]")
  status        RoomStatus @default(ACTIVE)
  createdAt     DateTime   @default(now())

  clinic Clinic @relation(fields: [clinicId], references: [id])

  @@map("sensory_room")
}
```

### 5. Update `User` model

Two additive changes:
- Add `@default(STAFF)` to the existing `role UserRole` field.
- Add two new optional fields: `credentialsQualifications String?` and `credentialsRegistrationNumber String?`.

No other User fields change.

## Files to Modify

- **`packages/db/prisma/schema/auth.prisma`** — all schema changes above

## Steps

1. Edit `auth.prisma` — all changes above in one pass.
2. `pnpm db:push` — push schema to the running database.
3. `pnpm db:generate` — regenerate the Prisma client.
4. `pnpm check-types` — confirm TypeScript is clean across all packages.

## Verification

- `pnpm check-types` passes with no errors.
- `pnpm db:studio` (or `psql`) shows `clinic`, `department`, `sensory_room` tables with all expected columns.
- `user` table has `credentials_qualifications` and `credentials_registration_number` columns.
- `UserRole` and `RoomStatus` enums exist in the database.
