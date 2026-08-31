# FE-16: Manual Session Creation UI

## Context

FE-05 (Treatment Plan Builder) built a Phase Builder panel and a `PlanGameAssignment` CRUD table (`GameAssignmentsTable`, `EditGameAssignmentSheet`, `GameLibraryBrowserSheet`) on the assumption that sessions get auto-generated from a plan-level game pool. FE-07 built a Room Assignment card on the session-detail page that assigns a room to an already-generated session, using an exact-timestamp conflict check.

**BE-16 removes generation, `phases`, and `PlanGameAssignment` entirely.** This issue reworks the frontend to match: a therapist creates each session directly — picking date/time/duration/room/therapist/game in one form — with a live conflict warning, instead of activating a plan and having sessions appear automatically.

**BE-16 must be done first** (schema + `session.create`/`session.checkConflicts`/rewritten `session.assignRoom` must exist).

**This supersedes:** the Phase Builder and game-assignment-table parts of FE-05, and extends FE-07's Room Assignment card with conflict-aware reassignment.

---

## Files to Delete

```
apps/web/src/features/plan/PhaseBuilder.tsx
apps/web/src/features/plan/GameAssignmentsTable.tsx
apps/web/src/features/plan/EditGameAssignmentSheet.tsx
apps/web/src/features/plan/DurationAdvisory.tsx
apps/web/src/features/plan/GameLibraryBrowserSheet.tsx
```

(`GameLibraryBrowserSheet`'s game-search/pagination internals are adapted into the new `GamePickerSheet` below, stripped of `frequencyPerWeek` and `appliesToPhase`.)

## Files to Create

```
apps/web/src/features/session/CreateSessionSheet.tsx
apps/web/src/features/session/GamePickerSheet.tsx
apps/web/src/features/session/ConflictWarning.tsx
apps/web/src/features/session/summarize-family-stats.ts   — extracted from progress-report/SessionSummary.tsx
```

## Files to Modify

```
apps/web/src/features/plan/schema.ts                                          — drop phases
apps/web/src/features/plan/types.ts                                           — drop Phase, GameAssignment types
apps/web/src/features/plan/use-plan-data.ts                                   — drop sessionDuration query
apps/web/src/features/plan/ModifyPlanSheet.tsx                                — drop gameAssignments prop usage
apps/web/src/features/plan/SessionsTab.tsx                                    — add "New Session" button + aggregate summary
apps/web/src/features/progress-report/SessionSummary.tsx                      — import shared summarize-family-stats util
apps/web/src/routes/_authenticated/children/$childId/plans/new.tsx            — remove Phase Builder section
apps/web/src/routes/_authenticated/children/$childId/plans/$planId/index.tsx  — remove game-assignment UI from Overview
apps/web/src/routes/_authenticated/sessions/$sessionId.tsx                    — show durationMinutes, conflict-aware room reassignment
```

---

## Step 1 — `features/plan/schema.ts` / `types.ts`

Remove `phases` from `PlanFormSchema` and `ModifyPlanFormSchema`; remove the `phases` mapping in `buildPlanDefaultValues` (both the preset branch and default branch). Delete the `Phase` type and the `GameAssignment` type from `types.ts` (no longer referenced anywhere once the deleted components are gone).

## Step 2 — `routes/.../plans/new.tsx`

Remove:
- The `PhaseBuilder` import and its `<SectionCard title="Phase Builder">` block (right-hand column of the create form).
- `phases: []` from `useForm` `defaultValues`.
- The `phases` mapping line inside the preset `onSelect` handler:
  ```typescript
  // DELETE:
  form.setValue("phases", found.session_structure.map(s => ({ phase: s.phase, weeks: s.minutes, label: s.label })));
  ```
Preset selection still pre-fills `name` and `sessionDurationMinutes` — only the `phases` line goes. Consider widening the "Plan Details" column to fill the space the Phase Builder occupied (single-column form is fine).

## Step 3 — `routes/.../plans/$planId/index.tsx`

Remove:
- `addGameSheetOpen`/`editingAssignment` state.
- The `addGame`/`removeGame` mutations and their `onSuccess`/`onError` handlers.
- `<GameLibraryBrowserSheet>` / `<EditGameAssignmentSheet>` renders.
- `<GameAssignmentsTable>` from the Overview tab.
- The `durationData`/`<DurationAdvisory>` block.
- `gameAssignments` from the local `planData` type.

Overview tab keeps `<GoalSection>` — since the games column is gone, let `GoalSection` take the full row width, or fold Overview and Goals into a single tab if that reads better (either is fine — pick whichever needs fewer layout changes to the existing tab shell).

## Step 4 — `features/plan/use-plan-data.ts`

Remove the `sessionDuration` query (`trpc.plan.checkSessionDuration.queryOptions(...)`) and drop it from the returned object and the `isLoading` array.

## Step 5 — `features/plan/ModifyPlanSheet.tsx`

Remove the `gameAssignments` prop and the "N game(s) assigned" static note that reads it — `plan` no longer has that field. No change to goal-decision handling (`goalDecisions` radio group, `CARRY_OVER`/`MODIFY`/`CLOSE`).

## Step 6 — `features/session/summarize-family-stats.ts` (new, extracted)

Move `summarizeFamilyStats` (and its `average` helper) out of `apps/web/src/features/progress-report/SessionSummary.tsx` into this new shared file, unchanged in behavior:

```typescript
export type FamilyStatsInput = {
  gameName: string;
  resultSummary: GameResultSummary | null;
}[];

export function summarizeFamilyStats(sessions: { gameAssignments: FamilyStatsInput }[]) {
  // same aggregation logic as today: per-game breakdown (sessions played,
  // family-specific "Performance" string — avg accuracy for
  // ARCADE/SELECTION, avg time + quiz correct-rate for DRAW)
}
```

Update `SessionSummary.tsx` to import from the new location instead of defining it locally.

## Step 7 — `features/session/ConflictWarning.tsx` (new)

A small presentational component, styled like the deleted `DurationAdvisory` (amber `Alert`):

```tsx
import { Alert, AlertDescription, AlertTitle } from "@haber-final/ui/components/alert";

type Conflict = { id: string; scheduledDate: Date; durationMinutes: number; child: { fullName: string } };

type ConflictWarningProps = {
  roomConflicts: Conflict[];
  therapistConflicts: Conflict[];
};

export function ConflictWarning({ roomConflicts, therapistConflicts }: ConflictWarningProps) {
  if (roomConflicts.length === 0 && therapistConflicts.length === 0) return null;

  return (
    <Alert className="bg-warning/10 border-warning/30">
      <AlertTitle className="text-warning flex items-center gap-2">
        <span className="material-symbols-outlined text-sm">warning</span>
        Scheduling Conflict
      </AlertTitle>
      <AlertDescription className="text-on-surface-variant text-sm space-y-1">
        {roomConflicts.map((c) => (
          <p key={c.id}>Room is already booked for {c.child.fullName} at {formatTime(c.scheduledDate)}.</p>
        ))}
        {therapistConflicts.map((c) => (
          <p key={c.id}>Therapist already has a session with {c.child.fullName} at {formatTime(c.scheduledDate)}.</p>
        ))}
        <p className="font-medium">You can still create this session, but double-check before proceeding.</p>
      </AlertDescription>
    </Alert>
  );
}
```

## Step 8 — `features/session/GamePickerSheet.tsx` (new, adapted from deleted `GameLibraryBrowserSheet`)

Same search/pagination/game-catalog browsing UX as the deleted sheet, but:
- Drop the `frequencyPerWeek` input and the `appliesToPhase` "Phase" text input entirely.
- Keep: game search, category filter, duration (`durationSeconds`), repetitions, instructions fields.
- Resolves to `{ gameVersionId, durationSeconds, repetitions, instructions }` via `onSelect`, instead of calling `plan.addGame` directly — the caller (`CreateSessionSheet`) holds this in local form state until the whole session is submitted.

```tsx
type GamePickerSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (game: { gameVersionId: string; gameName: string; durationSeconds?: number; repetitions?: number; instructions?: string }) => void;
};
```

## Step 9 — `features/session/CreateSessionSheet.tsx` (new — the centerpiece of this issue)

```tsx
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from "@haber-final/ui/components/sheet";
import { Button } from "@haber-final/ui/components/button";
import { Input } from "@haber-final/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@haber-final/ui/components/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import { TRPCClientError } from "@trpc/client";
import { trpc } from "@/utils/trpc";
import { GamePickerSheet } from "./GamePickerSheet";
import { ConflictWarning } from "./ConflictWarning";

type CreateSessionSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  childId: string;
  defaultDurationMinutes: number; // plan.sessionDurationMinutes, prefilled
  onSuccess: (sessionId: string) => void;
};

export function CreateSessionSheet({ open, onOpenChange, planId, childId, defaultDurationMinutes, onSuccess }: CreateSessionSheetProps) {
  const [scheduledDate, setScheduledDate] = useState<string>("");   // datetime-local value
  const [durationMinutes, setDurationMinutes] = useState(defaultDurationMinutes);
  const [roomId, setRoomId] = useState<string>();
  const [assignedTherapistId, setAssignedTherapistId] = useState<string>();
  const [game, setGame] = useState<{ gameVersionId: string; gameName: string; durationSeconds?: number; repetitions?: number; instructions?: string }>();
  const [gamePickerOpen, setGamePickerOpen] = useState(false);
  const [acknowledgeConflict, setAcknowledgeConflict] = useState(false);

  const rooms = useQuery(trpc.clinic.listSensoryRooms.queryOptions());
  const activeRooms = rooms.data?.filter((r) => r.status === "ACTIVE") ?? [];

  const canCheck = !!scheduledDate && !!durationMinutes && (!!roomId || !!assignedTherapistId);
  const conflicts = useQuery({
    ...trpc.session.checkConflicts.queryOptions({
      scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(),
      durationMinutes,
      roomId,
      assignedTherapistId,
    }),
    enabled: canCheck,
  });

  const utils = trpc.useUtils();
  const create = useMutation(trpc.session.create.mutationOptions({
    onSuccess: (session) => {
      toast.success("Session created");
      utils.session.listForPlan.invalidate({ planId });
      onOpenChange(false);
      onSuccess(session.id);
    },
    onError: (err) => {
      if (err instanceof TRPCClientError && err.data?.code === "CONFLICT") {
        setAcknowledgeConflict(true); // flips the submit button to "Create Anyway"
        return;
      }
      toast.error(err.message);
    },
  }));

  const hasConflicts = (conflicts.data?.roomConflicts.length ?? 0) > 0 || (conflicts.data?.therapistConflicts.length ?? 0) > 0;

  function handleSubmit() {
    if (!scheduledDate || !roomId || !game) {
      toast.error("Date, room, and game are required");
      return;
    }
    create.mutate({
      planId,
      scheduledDate: new Date(scheduledDate),
      durationMinutes,
      roomId,
      assignedTherapistId,
      gameVersionId: game.gameVersionId,
      durationSeconds: game.durationSeconds,
      repetitions: game.repetitions,
      instructions: game.instructions,
      acknowledgeConflict,
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>New Session</SheetTitle>
          <SheetDescription>Schedule a session for this treatment plan.</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          <div>
            <label className="text-sm font-medium">Date &amp; Time</label>
            <Input type="datetime-local" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Duration (minutes)</label>
            <Input type="number" min={15} step={15} value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} />
          </div>
          <div>
            <label className="text-sm font-medium">Room</label>
            <Select value={roomId} onValueChange={setRoomId}>
              <SelectTrigger><SelectValue placeholder="Select a sensory room" /></SelectTrigger>
              <SelectContent>
                {activeRooms.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Therapist</label>
            {/* reuse whatever query backs the child's assigned-therapist list; default to current user */}
          </div>
          <div>
            <label className="text-sm font-medium">Game</label>
            <Button type="button" variant="outline" className="w-full justify-start" onClick={() => setGamePickerOpen(true)}>
              {game ? game.gameName : "Choose a game…"}
            </Button>
          </div>

          {conflicts.data && (
            <ConflictWarning roomConflicts={conflicts.data.roomConflicts} therapistConflicts={conflicts.data.therapistConflicts} />
          )}
        </div>

        <SheetFooter className="flex-col sm:flex-row gap-2 mt-6">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={create.isPending}>
            {acknowledgeConflict ? "Create Anyway" : "Create Session"}
          </Button>
        </SheetFooter>

        <GamePickerSheet open={gamePickerOpen} onOpenChange={setGamePickerOpen} onSelect={(g) => { setGame(g); setGamePickerOpen(false); }} />
      </SheetContent>
    </Sheet>
  );
}
```

Key UX rule (per BE-16 D2): the live `checkConflicts` query is purely advisory and never blocks typing or field changes. Only the actual `create.mutate` submission can be rejected with `CONFLICT` — at which point the button flips to "Create Anyway" and the *next* click resubmits with `acknowledgeConflict: true`. Resetting `acknowledgeConflict` back to `false` whenever a field changes (so a stale acknowledgement doesn't silently apply to a since-edited request) is a reasonable refinement to add during implementation, not shown above for brevity.

## Step 10 — `features/plan/SessionsTab.tsx`

- Add a "New Session" button (top-right of the tab, hidden when `plan.status === "CLOSED"`) that opens `CreateSessionSheet`, passing `planId`, `childId`, and `defaultDurationMinutes={plan.sessionDurationMinutes}`.
- Add an aggregate summary block above the session list: call `summarizeFamilyStats` (Step 6) over the already-fetched `session.listForPlan` result (which already carries `resultSummary` per game assignment) — render status counts + the per-game breakdown table, visually similar to the printable `SessionSummary` but inline (no print styling). If `SessionSummary`'s field names (`session.games`) don't line up with `SessionsTab`'s shape (`session.gameAssignments`), normalize with a thin field-name adapter rather than duplicating the aggregation logic.

## Step 11 — `routes/.../sessions/$sessionId.tsx`

- Display `session.durationMinutes` next to the existing status/started-at text.
- Room Assignment card: keep as a "reassign room" affordance. Wire it to the rewritten `session.assignRoom` (now conflict-aware): on `CONFLICT` error, show the same `ConflictWarning` component inline above the room `Select`, and offer a confirm step that resubmits with `acknowledgeConflict: true` — mirroring `CreateSessionSheet`'s pattern.
- No changes to game-list rendering, `GameResultCard`, notes, or close-session flow — untouched.

---

## tRPC Hooks Used (new/changed)

| Hook | Purpose |
|---|---|
| `trpc.session.checkConflicts.useQuery()` | Live conflict warning while filling out `CreateSessionSheet` |
| `trpc.session.create.useMutation()` | Submits the manually-built session + its one game assignment |
| `trpc.session.assignRoom.useMutation()` | Now conflict-aware; requires `acknowledgeConflict` on retry |
| `trpc.clinic.listSensoryRooms.useQuery()` | Room picker options (filtered to `ACTIVE`) |
| `trpc.session.listForPlan.useQuery()` | Session list + aggregate summary source on `SessionsTab` |

Removed: `trpc.plan.addGame`, `trpc.plan.removeGame`, `trpc.plan.updateGame`, `trpc.plan.reorderGames`, `trpc.plan.checkSessionDuration` (procedures deleted in BE-16).

---

## Out of Scope

- `GameResultCard`/`ArcadeResultView`/`DrawResultView`/`SelectionResultView` — unchanged, per BE-16.
- Dashboard components (`RoomUtilisationTable`, `MyWeekCalendar`, `SessionCalendar`) — read-only consumers of `dashboard.ts`'s output; expect no changes beyond a compile-check pass once field names flow through from the BE-16 rewrite.
- Printable Progress Report (`ProgressReportPage`) — unaffected beyond importing the extracted `summarize-family-stats.ts` util (Step 6).

---

## Verification

1. `pnpm check-types` — must pass across all packages; this is the fastest way to catch every stale reference to `phases`/`GameAssignment`/`Phase` left behind.
2. `pnpm check` (Biome) — on all new/edited/deleted files.
3. **Plan create smoke test**: Phase Builder panel is gone from `/children/:childId/plans/new`; preset selection still pre-fills name and session duration.
4. **Plan detail smoke test**: Overview tab no longer shows a game-assignment table or duration advisory; Goals section renders correctly at full width.
5. **Session creation smoke test**: from a plan's Sessions tab, click "New Session," fill date/duration/room/therapist/game, submit with no conflicts → session created, sheet closes, navigates to `/sessions/:sessionId` showing the picked game.
6. **Conflict smoke test**: create a second session with an overlapping room/time → inline `ConflictWarning` appears before submit; submitting shows "Create Anyway" after the first `CONFLICT` rejection; clicking it again succeeds. Repeat for therapist overlap.
7. **Aggregate summary smoke test**: Sessions tab's aggregate block reflects the same status counts and per-game performance as the printable Progress Report for the same session set.
8. **Room reassignment smoke test**: on an existing session's detail page, reassigning to an already-booked room shows the same conflict warning and "confirm anyway" pattern.
