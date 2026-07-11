# FE-14 : Admin UI for Child Soft-Delete & Deleted Records View

## Context

Expose the existing `child.softDelete` backend procedure via an admin UI on the child profile page, and build a deleted-records management view for DPDP compliance. All three backend procedures already exist:
- `child.softDelete` (input: `{ childId: string }`) — sets `deletedAt`
- `child.listDeleted` (input: `ChildListInput`) — returns paginated deleted children
- `child.permanentDelete` (input: `{ childId: string }`) — enforces 7-year retention, then hard deletes

Additionally, `dpdp.retentionReport` returns computed `retentionExpiresAt` and `pastRetentionWindow` fields that can be used instead of computing them client-side.

**No backend changes needed.** This is purely frontend work.

## Decisions

| Question | Decision |
|---|---|
| Use `dpdp.retentionReport` or `child.listDeleted` for deleted records table? | Use `dpdp.retentionReport` — it already computes `retentionExpiresAt` and `pastRetentionWindow`, avoiding client-side date math |
| Dialog component? | Use `Dialog` from `@haber-final/ui/components/dialog` (same pattern as `DeleteDepartmentDialog` in `settings/departments/index.tsx`) |
| Table layout? | Use the grid-based row pattern from `children/index.tsx` (not the `Table` component) |
| Navigation item icon? | Use `Trash2` from `lucide-react` (already used in departments page for delete actions) |

## Files to Create

| File | Purpose |
|---|---|
| `apps/web/src/routes/_authenticated/settings/deleted-records/index.tsx` | Deleted records management page with table, badges, and permanent delete |

## Files to Modify

| File | Change |
|---|---|
| `apps/web/src/components/shell/AppShell.tsx` | Add "Deleted Records" nav item under a "Compliance" section for `CLINIC_ADMIN` and `SUPER_ADMIN` |
| `apps/web/src/routes/_authenticated/children/$childId/index.tsx` | Add "Delete Child Record" button and confirmation dialog for admins |

## Step 1 — Add navigation item to AppShell

Add a new `NavItem` to the `NAV_ITEMS` array in `AppShell.tsx`. Place it after the existing settings items. Visible to `CLINIC_ADMIN` and `SUPER_ADMIN`.

```typescript
{
    label: "Deleted Records",
    to: "/settings/deleted-records",
    icon: <Trash2 className="h-4 w-4" />,
    roles: ["CLINIC_ADMIN", "SUPER_ADMIN"],
},
```

Import `Trash2` from `lucide-react` (already imported in departments page pattern).

## Step 2 — Add "Delete Child Record" button and dialog to child profile page

In `children/$childId/index.tsx`, add:

1. State variables for dialog control:
```typescript
const [deleteOpen, setDeleteOpen] = useState(false);
const [deleteReason, setDeleteReason] = useState("");
const [deleteConfirmText, setDeleteConfirmText] = useState("");
```

2. `softDelete` mutation using the existing pattern from `withdrawMutation`:
```typescript
const softDeleteMutation = useMutation(
    trpc.child.softDelete.mutationOptions({
        onSuccess: () => {
            toast.success("Child record deleted");
            router.navigate({ to: "/children" });
        },
        onError: (err) => toast.error(err.message),
    }),
);
```

3. A destructive button in the "Actions" card (visible only when `isAdmin`):
```typescript
{isAdmin && (
    <Button
        variant="outline"
        className="w-full gap-2 border-red-300 text-red-600 hover:bg-red-50"
        onClick={() => setDeleteOpen(true)}
    >
        <Trash2 className="h-4 w-4" />
        Delete Child Record
    </Button>
)}
```

4. A `DeleteChildDialog` component (following the `DeleteDepartmentDialog` pattern) with:
   - Warning text: "This action permanently removes the child from active records. Data is retained for 7 years per DPDP requirements."
   - Optional text field for reason
   - Text input requiring "DELETE" to enable the confirm button
   - Two buttons: Cancel (outline) and Delete Record (destructive, disabled until confirm text matches)

## Step 3 — Create deleted records page

Create `apps/web/src/routes/_authenticated/settings/deleted-records/index.tsx`:

1. Route with `beforeLoad` guard for `CLINIC_ADMIN` or `SUPER_ADMIN`:
```typescript
export const Route = createFileRoute("/_authenticated/settings/deleted-records/")({
    beforeLoad: () => {
        const role = useAuthStore.getState().role;
        if (role !== "CLINIC_ADMIN" && role !== "SUPER_ADMIN") {
            throw redirect({ to: "/dashboard" });
        }
    },
    component: DeletedRecordsPage,
});
```

2. Query using `dpdp.retentionReport`:
```typescript
const { data: deletedRecords, isLoading } = useQuery(
    trpc.dpdp.retentionReport.queryOptions(),
);
```

3. Table using the grid-based row pattern from `children/index.tsx`:
   - Columns: Child Name, OP Number, Date of Birth, Deleted On, Retention Expires, Status, Actions
   - Each row shows a "View Record" link navigating to `/children/$childId`
   - Status badge: "Retention Window" (yellow/amber) or "Eligible for Permanent Delete" (red) based on `pastRetentionWindow`

4. `permanentDelete` mutation (SUPER_ADMIN only):
```typescript
const permanentDeleteMutation = useMutation(
    trpc.child.permanentDelete.mutationOptions({
        onSuccess: () => {
            toast.success("Record permanently deleted");
            queryClient.invalidateQueries({
                queryKey: trpc.dpdp.retentionReport.queryOptions().queryKey,
            });
        },
        onError: (err) => toast.error(err.message),
    }),
);
```

5. Confirmation dialog for permanent delete (same pattern as soft-delete dialog) — only shown to `SUPER_ADMIN` when `pastRetentionWindow` is true.

6. Empty state when no deleted records exist (same pattern as `children/index.tsx`).

## Step 4 — Run type check

Run `pnpm check-types` to verify no type errors.

## Verification

- [ ] "Delete Child Record" button visible only to `CLINIC_ADMIN` and `SUPER_ADMIN` on child profile
- [ ] Confirmation dialog requires typing "DELETE" before confirm button is enabled
- [ ] Successful soft-delete redirects to children list
- [ ] `/settings/deleted-records` route accessible to `CLINIC_ADMIN` and `SUPER_ADMIN`
- [ ] Deleted records table shows all soft-deleted children with retention expiry dates
- [ ] Records within 7-year window show "Retention Window" badge
- [ ] "Permanently Delete" button only shown to `SUPER_ADMIN` for records past 7-year window
- [ ] Page shows empty state gracefully
- [ ] `pnpm check-types` passes

## Blocked by

None — all backend procedures already exist.
