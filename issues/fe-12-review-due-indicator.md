# FE-12: Review-Due Indicator & Claim Flow (Multi-Therapist)

## What to build

Surface a review-due badge on the children list and child profile header for all assigned therapists. Add a backend procedure to claim review ownership, and auto-claim when a therapist opens a new follow-up.

**Package:** `apps/web` + `packages/api`

### Backend changes (`packages/api/src/routers/child.ts`)

Add one new procedure:

```
child.claimReview (protected, THERAPIST | CLINIC_ADMIN) → void
  input: { childId }
  — Finds the calling therapist's ChildTherapistAssignment row for childId
  — Sets reviewClaimed = true, reviewClaimedBy = ctx.auth.userId
  — Throws NOT_FOUND if calling therapist is not assigned to this child
```

No schema migration needed — `reviewClaimed` (boolean) and `reviewClaimedBy` (string?) already exist on `ChildTherapistAssignment`.

### Frontend changes

**Children list (`apps/web/src/routes/_authenticated/children/index.tsx`):**

- For each child row, check if any of the calling therapist's `ChildTherapistAssignment` rows has `reviewDueAt ≤ today` and `reviewClaimed = false`
- If yes, render a yellow badge `Review Due` next to the child's name
- Extend `child.list` response to include the therapist's own `reviewDueAt` and `reviewClaimed` for each child (add to the existing `listAssignedChildren` query or extend `child.list`)

**Child profile header (`apps/web/src/routes/_authenticated/children/$childId/index.tsx`):**

- Add the same `Review Due` badge in the header when conditions are met
- Once claimed, show `Review In Progress` (muted) so the therapist knows it is claimed

**Follow-up creation (`apps/web/src/routes/_authenticated/children/$childId/followup/new.tsx`):**

- On component mount (or on first submit), call `child.claimReview({ childId })` automatically
- This ensures the first therapist to open the follow-up form claims the review slot
- Other assigned therapists then see the review as claimed

### tRPC hooks used

- `api.child.claimReview.useMutation()`
- Extend `api.child.listAssignedChildren.useQuery()` to return `reviewDueAt`, `reviewClaimed`, `reviewClaimedBy` per child

## Acceptance criteria

- [ ] Children list shows `Review Due` badge for children where `reviewDueAt ≤ today` and `reviewClaimed = false` for the viewing therapist
- [ ] Child profile header shows the same `Review Due` badge
- [ ] Opening `/children/$childId/followup/new` auto-calls `child.claimReview` for the current therapist
- [ ] After claim: badge changes to `Review In Progress` for the claiming therapist
- [ ] After claim: other assigned therapists see `Review Claimed` and do not see `Review Due`
- [ ] `child.claimReview` returns NOT_FOUND if caller is not assigned to the child
- [ ] `pnpm check-types` passes

## Blocked by

- None (DB fields `reviewClaimed`, `reviewClaimedBy`, `reviewDueAt` already exist on `ChildTherapistAssignment`)
