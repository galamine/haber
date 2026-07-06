# FE-15 : Follow-up Entry Point 

## Context

The route `/children/$childId/followup/new` is fully built (form, validation, submit mutation, post-submit redirect) but has **no entry point** in the UI. The child detail page's "Assessments" tab shows "Assessments coming soon." The Overview tab's "Actions" card has a "Start Assessment" button gated on intake completeness.

**Existing work to leverage:**
- `apps/web/src/routes/_authenticated/children/$childId/followup/new.tsx` — complete follow-up form
- `trpc.assessment.get` — fetches latest initial assessment
- `trpc.assessment.getActivePlan` — fetches active treatment plan

**Decision:** Per user, add button **only in Overview → Actions card** (alongside "Start Assessment"). Keep Assessments tab placeholder unchanged.

## Files to Modify

| File | Change |
|---|---|
| `apps/web/src/routes/_authenticated/children/$childId/index.tsx` | Add two queries + "Start Follow-up" button in Actions card |

## Step 1 — Add Initial Assessment & Active Plan Queries

Add two `useQuery` hooks alongside existing queries (after line 121). Reuse existing tRPC procedures — no new backend code. **Use TanStack Query v5 syntax (spread operator).**

```typescript
const initialAssessment = useQuery({
  ...trpc.assessment.get.queryOptions({ childId }),
  retry: false,
  meta: { suppressErrorToast: true },
});
const activePlan = useQuery(
  trpc.assessment.getActivePlan.queryOptions({ childId })
);
```

## Step 2 — Add "Start Follow-up" Button in Actions Card

Insert after "Manage Consent" button (~line 295). Disable when prerequisites missing. Same pattern as "Start Assessment" button.

```tsx
<Button
  className="w-full"
  disabled={!initialAssessment.data || !activePlan.data}
  title={!initialAssessment.data || !activePlan.data
    ? "Initial assessment and active treatment plan required"
    : undefined}
  onClick={() =>
    router.navigate({
      to: "/children/$childId/followup/new",
      params: { childId },
    })
  }
>
  Start Follow-up
</Button>
```

## Verification

- [ ] Button appears in Overview → Actions card
- [ ] Button disabled when no initial assessment exists
- [ ] Button disabled when no active treatment plan exists
- [ ] Button enabled when both exist
- [ ] Click navigates to `/children/$childId/followup/new` with correct `childId`
- [ ] `pnpm check-types` passes

## Blocked by

- None (route, form, schema, mutations already exist)