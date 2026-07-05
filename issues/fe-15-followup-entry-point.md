# FE-15: Follow-up Entry Point (Orphan Route Fix)

## What to build

Add a "Start Follow-up" action on the child detail page that navigates to the existing (but currently unreachable) follow-up assessment form.

**Package:** `apps/web`

### Background

An orphan-route audit of `apps/web/src/routes` found that `/children/$childId/followup/new` — a fully built feature (`FollowUpTabsShell`, sections A–F, `FollowUpFormSchema`, submit mutation, post-submit redirect to `followup/$followUpId`) — has no entry point anywhere in the UI. The child detail page's "Assessments" tab (`apps/web/src/routes/_authenticated/children/$childId/index.tsx`) is currently a `coming soon` placeholder with no follow-up action.

### Frontend changes

**Child detail page (`apps/web/src/routes/_authenticated/children/$childId/index.tsx`):**

- Add a "Start Follow-up" button that calls `router.navigate({ to: "/children/$childId/followup/new", params: { childId } })`
- Place it either in the "Assessments" tab (replacing the placeholder) or the Overview "Actions" card alongside the existing "Start Assessment" button

### Relationship to FE-12

`issues/fe-12-review-due-indicator.md` already assumes `followup/new` is reachable (it auto-calls `child.claimReview` on mount) but never specifies the UI element that navigates there. If FE-12 lands first, this button should be paired with the review-due badge logic (e.g. only surfaced once an initial assessment + plan exist, similar to how "Start Assessment" is gated on intake completeness).

## Acceptance criteria

- [ ] A visible action on the child detail page navigates to `/children/$childId/followup/new`
- [ ] Clicking it correctly passes `childId` as a route param
- [ ] `pnpm check-types` passes

## Blocked by

- None (route/form/schema already exist; this is purely a missing navigation entry point)
