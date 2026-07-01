# FE-14: Admin UI for Child Soft-Delete & Deleted Records View

## What to build

Expose the existing `child.softDelete` procedure via an admin UI in the child profile page, and add a deleted-records management view for DPDP compliance auditing.

**Package:** `apps/web`

The backend procedure (`child.softDelete`) already exists in `packages/api/src/routers/child.ts`. This issue is purely frontend work plus one new `child.listDeleted` procedure (which is also listed in BE-15 — coordinate to avoid duplication).

### New route

Add one file under `apps/web/src/routes/_authenticated/settings/`:

```
settings/
└── deleted-records/
    └── index.tsx        → /settings/deleted-records
```

Visible only to `CLINIC_ADMIN` and `SUPER_ADMIN` (add to AppShell settings nav under a "Compliance" section).

### Child profile page changes (`/children/$childId/index.tsx`)

Add a "Delete Child Record" action accessible to `CLINIC_ADMIN` and `SUPER_ADMIN` only:

- Add a destructive action button (or kebab menu item) labeled "Delete Child Record"
- Opens a confirmation dialog:
  - Warning: "This action permanently removes the child from active records. Data is retained for 7 years per DPDP requirements."
  - Optional text field: "Reason for deletion (optional)"
  - Two buttons: "Cancel" | "Delete Record" (red, requires typing "DELETE" to enable)
- On confirm: calls `child.softDelete({ id: childId, reason? })`
- On success: redirect to `/children` list (child should no longer appear)

### Deleted records page (`/settings/deleted-records`)

Calls `child.listDeleted` (from BE-15 — add a stub procedure returning empty array until BE-15 is implemented):

**Table columns:**
- Child Name
- OP Number
- Date of Birth
- Deleted On (formatted `deletedAt`)
- Retention Expires (formatted `deletedAt + 7 years`)
- Status badge: `Retention Window` (yellow) or `Eligible for Permanent Delete` (red, only past 7 years)
- Actions: `View Record` link (for audit purposes)

**For SUPER_ADMIN only:** show a `Permanently Delete` button for records past the 7-year window. This calls `child.permanentDelete` (from BE-15) with a second confirmation dialog.

### tRPC hooks used

- `api.child.softDelete.useMutation()`
- `api.child.listDeleted.useQuery()` (returns `[]` until BE-15 is done)

## Acceptance criteria

- [ ] "Delete Child Record" button is visible only to `CLINIC_ADMIN` and `SUPER_ADMIN` on the child profile page
- [ ] Confirmation dialog requires typing "DELETE" before the confirm button is enabled
- [ ] Successful soft-delete redirects to children list; the child is no longer visible in standard list
- [ ] `/settings/deleted-records` route is accessible to `CLINIC_ADMIN` and `SUPER_ADMIN`
- [ ] Deleted records table shows all soft-deleted children with retention expiry dates
- [ ] Records within 7-year window show `Retention Window` badge
- [ ] `Permanently Delete` button is only shown to `SUPER_ADMIN` for records past the 7-year window
- [ ] Page shows empty state gracefully before BE-15 ships
- [ ] `pnpm check-types` passes

## Blocked by

- `child.softDelete` — already exists (no BE dependency)
- `child.listDeleted` and `child.permanentDelete` — from BE-15 (the deleted-records table can stub with empty state until BE-15 ships)
