# BE-17: Permission Gap + Goal ADD Action + Section G Goal Sync

## What to build

Three related backend gaps resolved together:

1. Add the missing `treatment_plan.modify_minor` permission
2. Add an `ADD` action to `plan.modify` so new goals can be created during plan modification
3. Auto-create `Goal` entities from the initial assessment Section G goals

**Packages:** `packages/db` + `packages/api` + `apps/web`

---

### Part 1 — Add missing permission

**`packages/db/src/permissions.ts`:**

```typescript
export const PERMISSIONS = {
  CHILD_INTAKE: "child.intake",
  SESSION_RUN: "session.run",
  TREATMENT_PLAN_MODIFY: "treatment_plan.modify",
  TREATMENT_PLAN_MODIFY_MINOR: "treatment_plan.modify_minor",  // ← add
} as const;
```

**`packages/api/src/routers/plan.ts` — identify minor-modify operations:**

Minor modifications are non-versioning edits that do not change clinical intent:
- Editing `instructions` or `notes` on a `PlanGameAssignment`
- Editing `session_duration_minutes`
- Reordering games

Add a permission check to these operations:

```typescript
// In plan.updateGame, plan.reorderGames, plan.extend:
if (!hasPermission(ctx, PERMISSIONS.TREATMENT_PLAN_MODIFY) &&
    !hasPermission(ctx, PERMISSIONS.TREATMENT_PLAN_MODIFY_MINOR)) {
  throw new TRPCError({ code: "FORBIDDEN" });
}
```

Major modifications (activate, modify/version, close) continue to require `TREATMENT_PLAN_MODIFY`.

---

### Part 2 — ADD action in plan.modify

**`packages/api/src/routers/plan.ts`:**

Extend `ModificationDecisionInput` Zod schema:

```typescript
const ModificationDecisionInput = z.discriminatedUnion("action", [
  z.object({ action: z.literal("CLOSE"),      goalId: z.string() }),
  z.object({ action: z.literal("CARRY_OVER"), goalId: z.string() }),
  z.object({ action: z.literal("MODIFY"),     goalId: z.string(), newDescription: z.string().optional(), newHorizon: z.enum(["SHORT_TERM","LONG_TERM"]).optional(), newTargetAttainmentPct: z.number().min(0).max(100).optional() }),
  z.object({ action: z.literal("ADD"),        description: z.string(), horizon: z.enum(["SHORT_TERM","LONG_TERM"]), targetAttainmentPct: z.number().min(0).max(100) }),  // ← new
]);
```

In `applyPlanModificationDecisions`, add:

```typescript
else if (d.action === "ADD") {
  await tx.goal.create({
    data: {
      treatmentPlanId: newPlanId,
      description: d.description,
      horizon: d.horizon,
      targetAttainmentPct: d.targetAttainmentPct,
      currentAttainmentPct: 0,
      status: "IN_PROGRESS",
    },
  });
}
```

**Frontend — `ModifyPlanSheet` component:**

Add a "New Goals" accordion section to the plan modification sheet:
- `+ Add Goal` button appends a row with description, horizon, and target % fields
- Each new goal row maps to an `ADD` decision passed to `plan.modify`

---

### Part 3 — Auto-create Goal entities from Section G

**`packages/api/src/routers/assessment.ts`:**

After `assessment.create` and `assessment.review` insert the `InitialAssessment` row, read `sectionG` for goal data and auto-create `Goal` rows:

```typescript
// After insertingthe assessment:
const sectionG = input.sectionG;  // Zod-parsed
const activePlan = await tx.treatmentPlan.findFirst({
  where: { childId: input.childId, isActive: true },
});

if (activePlan && sectionG?.shortTermGoals?.length) {
  for (const g of sectionG.shortTermGoals) {
    if (g.description) {
      await tx.goal.create({
        data: {
          treatmentPlanId: activePlan.id,
          description: g.description,
          horizon: "SHORT_TERM",
          targetAttainmentPct: 100,
          currentAttainmentPct: 0,
          status: "IN_PROGRESS",
        },
      });
    }
  }
}
// Repeat for longTermGoals with horizon: "LONG_TERM"
```

If no active plan exists, skip silently (goals are informational until a plan is created).

**No FE changes required** — goals appear automatically in the plan's goal section once created.

---

## Acceptance criteria

- [ ] `permissions.ts` exports `TREATMENT_PLAN_MODIFY_MINOR = "treatment_plan.modify_minor"`
- [ ] `plan.updateGame` and `plan.reorderGames` accept callers with either `treatment_plan.modify` or `treatment_plan.modify_minor` permission
- [ ] `plan.activate`, `plan.modify`, and `plan.close` still require `treatment_plan.modify`
- [ ] `plan.modify` accepts `{ action: "ADD", description, horizon, targetAttainmentPct }` decisions and creates new `Goal` rows on the new plan version
- [ ] `ModifyPlanSheet` FE renders a "New Goals" section where therapist can add goals during modification
- [ ] `assessment.create` auto-creates `Goal` rows for Section G short/long-term goals when an active plan exists
- [ ] `assessment.review` does the same for updated Section G goals
- [ ] No duplicate goals if called twice on the same assessment version
- [ ] `pnpm check-types` passes

## Blocked by

- None
