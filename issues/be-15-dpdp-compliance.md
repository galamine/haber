# BE-15: DPDP Compliance (Soft Delete & 7-Year Retention)

## What to build

Ensure soft-delete is consistently enforced for data principals (Child, Guardian), implement the 7-year statutory retention window, and add query filters so soft-deleted records are excluded from standard queries.

**Packages:** `packages/api`

### Soft-delete enforcement

Add a Prisma middleware (or query extension) to `packages/api/src/db.ts` that automatically appends `where: { deletedAt: null }` to all `findMany`, `findFirst`, and `findUnique` queries on `Child` and `Guardian`.

Override is available for `SUPER_ADMIN` and `CLINIC_ADMIN` who pass `includeDeleted: true`.

### tRPC procedures

Add to `packages/api/src/router/child.ts`:

```
child.softDelete   (CLINIC_ADMIN | SUPER_ADMIN) → void
  input: { id, reason? }
  — Already specified in BE-05; this issue adds the retention enforcement

child.listDeleted  (CLINIC_ADMIN) → PaginatedChildren
  — Returns soft-deleted children with their deletedAt date

child.permanentDelete (SUPER_ADMIN) → void
  input: { id }
  — ONLY permitted if deletedAt < now() - 7 years
  — Throws FORBIDDEN if child is within retention window
  — Cascades deletion via Prisma (Child → Guardian → ConsentRecord, etc.)
```

Add `packages/api/src/router/dpdp.ts`:

```
dpdp.retentionReport (SUPER_ADMIN | CLINIC_ADMIN) → RetentionReportEntry[]
  — Lists soft-deleted children with their retention expiry date (deletedAt + 7 years)
  — Flags records that are past the retention window and eligible for permanent deletion
```

### Data residency

Document in `packages/api/src/env.ts` that `DATABASE_URL` must point to an India-region PostgreSQL instance (Supabase Mumbai / RDS ap-south-1). Add a `DATA_REGION` env var check at startup that warns if not set to `"india"`.

### Prisma middleware

```typescript
// In packages/api/src/db.ts
prisma.$use(async (params, next) => {
  if (['Child', 'Guardian'].includes(params.model)) {
    if (['findMany', 'findFirst', 'findUnique'].includes(params.action)) {
      if (!params.args?.where?.includeDeleted) {
        params.args = { ...params.args, where: { ...params.args?.where, deletedAt: null } }
      }
      delete params.args?.where?.includeDeleted
    }
  }
  return next(params)
})
```

## Acceptance criteria

- [ ] `child.softDelete` sets `deletedAt = now()` and soft-deleted child disappears from `child.list` for standard queries
- [ ] `child.listDeleted` returns soft-deleted children for admins
- [ ] `child.permanentDelete` fails with `FORBIDDEN` if `deletedAt` is within 7 years of today
- [ ] `child.permanentDelete` succeeds for records past the 7-year window
- [ ] `dpdp.retentionReport` returns retention expiry dates and flags past-window records
- [ ] Prisma middleware correctly excludes `deletedAt IS NOT NULL` rows from all standard Child/Guardian queries
- [ ] Admin passing `includeDeleted: true` receives soft-deleted records
- [ ] Startup logs a warning if `DATA_REGION` is not set to `"india"`
- [ ] `pnpm typecheck` passes

## Blocked by

- BE-05 (Child and Guardian soft-delete field must exist and child CRUD must be implemented)
