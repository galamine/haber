# FE-05: Treatment Plan Builder UI — Implementation Plan

## Context

Build the Treatment Plan Builder UI: preset selection, game assignment with duration/rep overrides, plan lifecycle controls (activate, pause, close), and plan modification with goal lifecycle decisions.

**BE-10 (Treatment plan API) is implemented.** The following are already done and should not be re-created:
- Prisma schema: `TreatmentPlan`, `Goal`, `PlanGameAssignment` models in `packages/db/prisma/schema/plans.prisma`
- Schemas in `packages/api/src/schemas/plan.ts`: `CreatePlanInput`, `AddGameInput`, `UpdateGameInput`, `ReorderGamesInput`, `ModificationDecisionInput`, `ModifyPlanInput`, `PlanPresetSchema`
- Procedures on `planRouter`: `create`, `get`, `list`, `listActive`, `addGame`, `removeGame`, `updateGame`, `reorderGames`, `checkSessionDuration`, `activate`, `pause`, `resume`, `extend`, `close`, `modify`, `listPresets`

**Blockers:**
- FE-02 (Child profile is the entry point to plans) — the "Plans" tab in child profile currently shows placeholder text
- No existing `game.list` or `gameVersion.list` tRPC procedure — the GameLibraryBrowserSheet will need to be built once a game router exists (defer to BE-10 or create a placeholder that shows "Game library coming soon" if the game router doesn't exist yet)

---

## Implemented API Schemas (from `packages/api/src/schemas/plan.ts`)

```
CreatePlanInput: { childId, name, programLengthWeeks, phases?, startDate?, targetMilestones?, sessionDurationMinutes?, presetId? }
AddGameInput: { planId, gameVersionId, durationSeconds?, repetitions?, frequencyPerWeek?, instructions?, appliesToPhase? }
UpdateGameInput: { assignmentId, durationSeconds?, repetitions?, frequencyPerWeek?, instructions?, appliesToPhase? }
ReorderGamesInput: { planId, orderedIds[] }
ModificationDecisionInput: { goalId, action: "CARRY_OVER" | "CLOSE" | "MODIFY", newDescription?, newHorizon?, newTargetAttainmentPct? }
ModifyPlanInput: { planId, changes: { name?, programLengthWeeks?, phases?, startDate?, targetMilestones?, sessionDurationMinutes? }, goalDecisions[] }
PlanPresetSchema: { preset_id, case_label, linked_diagnoses[], session_duration_minutes, session_structure[], short_term_goals_template[], long_term_goals_template[], home_program }
```

**Key facts:**
- `phases` is stored as `Json` — array of `{phase, weeks, label}` objects
- `plan.listPresets()` returns presets from `clinical-data/treatment-plan-presets.json`
- `plan.checkSessionDuration` returns `{ totalSeconds, limitSeconds, exceeds }`
- `plan.modify` creates a new plan version with `versionNumber: current.versionNumber + 1`, copies game assignments, and applies goal decisions via `applyPlanModificationDecisions`
- Goal decisions: `CARRY_OVER` creates a new goal linked to old via `supersededByGoalId`, `CLOSE` marks old goal as `DISCONTINUED`, `MODIFY` creates a new goal with updated description/horizon/pct

---

## Frontend File Structure

```
apps/web/src/
├── routes/_authenticated/children/$childId/
│   ├── plans/
│   │   ├── index.tsx                  ← PlansListPage
│   │   ├── new.tsx                   ← NewPlanPage
│   │   └── $planId/
│   │       ├── index.tsx              ← PlanDetailPage
│   │       └── edit.tsx               ← PlanEditPage (inline with ModifyPlanSheet on detail)
│   └── ...
└── features/plan/
    ├── constants.ts
    ├── schema.ts
    ├── types.ts
    ├── use-plan-data.ts
    ├── PresetCard.tsx                 ← individual preset card
    ├── PhaseBuilder.tsx               ← drag-reorder phase blocks
    ├── GameAssignmentsTable.tsx       ← table with inline edit
    ├── DurationAdvisory.tsx           ← Alert for session duration mismatch
    ├── GoalSection.tsx                ← goals list with progress bars
    ├── ModifyPlanSheet.tsx            ← Sheet for modifying active plan
    ├── GameLibraryBrowserSheet.tsx    ← Sheet for adding games (stub if no game router)
    ├── PlanHeader.tsx                 ← plan name, version, status badges
    ├── PlanLifecycleButtons.tsx       ← Activate/Pause/Resume/Extend/Close buttons
    └── skeletons/
        ├── PlanDetailSkeleton.tsx
        └── PlanListSkeleton.tsx
```

**Reuse directly (import, do not copy):**

| Component | Source path |
|---|---|
| `SectionCard` | `features/assessment/SectionCard.tsx` |
| `FieldWrapper` | `features/assessment/FieldWrapper.tsx` |
| `Sheet`, `SheetContent`, `SheetHeader`, `SheetFooter`, `SheetTitle`, `SheetDescription` | `packages/ui/src/components/sheet.tsx` |
| `Alert` | `packages/ui/src/components/alert.tsx` |
| `Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, `TableCell` | `packages/ui/src/components/table.tsx` |
| `Badge` | `packages/ui/src/components/badge.tsx` |
| `Button` | `packages/ui/src/components/button.tsx` |
| `Input` | `packages/ui/src/components/input.tsx` |
| `Textarea` | `packages/ui/src/components/textarea.tsx` |
| `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` | `packages/ui/src/components/select.tsx` |
| `Slider` | `packages/ui/src/components/slider.tsx` |
| `Switch` | `packages/ui/src/components/switch.tsx` |
| `Skeleton` | `packages/ui/src/components/skeleton.tsx` |
| `Progress` | `packages/ui/src/components/progress.tsx` |

---

## Creation Order (strict)

1. `features/plan/constants.ts`
2. `features/plan/types.ts`
3. `features/plan/schema.ts`
4. `features/plan/use-plan-data.ts`
5. `features/plan/PresetCard.tsx`
6. `features/plan/DurationAdvisory.tsx`
7. `features/plan/PlanHeader.tsx`
8. `features/plan/PlanLifecycleButtons.tsx`
9. `features/plan/PhaseBuilder.tsx`
10. `features/plan/GameAssignmentsTable.tsx`
11. `features/plan/GoalSection.tsx`
12. `features/plan/GameLibraryBrowserSheet.tsx` (stub if game router not available)
13. `features/plan/ModifyPlanSheet.tsx`
14. `features/plan/skeletons/PlanDetailSkeleton.tsx`
15. `features/plan/skeletons/PlanListSkeleton.tsx`
16. `routes/_authenticated/children/$childId/plans/index.tsx` — PlansListPage
17. `routes/_authenticated/children/$childId/plans/new.tsx` — NewPlanPage
18. `routes/_authenticated/children/$childId/plans/$planId/index.tsx` — PlanDetailPage
19. Update `routes/_authenticated/children/$childId/index.tsx` — replace plans placeholder with actual tab content linking to plans list

---

## File-by-File Details

### `features/plan/constants.ts`

```ts
export const PRESET_CARDS = [
  { preset_id: "preset_asd_sensory", case_label: "ASD Protocol", icon: "psychology", description: "Autism Spectrum Disorder baseline intervention focusing on communication." },
  { preset_id: "preset_cp_spastic_diplegia_gmfcs2", case_label: "CP Mobility", icon: "assist_walker", description: "Cerebral Palsy focused physical therapy and motor skill enhancement." },
  { preset_id: "preset_adhd_sustained_attention", case_label: "ADHD Focus", icon: "bolt", description: "Attention and executive function building exercises and routines." },
  { preset_id: "preset_down_syndrome", case_label: "Down Syndrome", icon: "favorite", description: "Comprehensive developmental support and speech therapy framework." },
  { preset_id: "preset_dcd_motor_planning", case_label: "DCD Framework", icon: "directions_run", description: "Developmental Coordination Disorder motor planning and execution." },
] as const;

export const PLAN_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-surface-container text-on-surface-variant border-outline-variant",
  ACTIVE: "bg-[#dcfce7] text-[#15803d] border-[#bbf7d0]",
  PAUSED: "bg-[#fef3c7] text-[#b45309] border-[#fde68a]",
  COMPLETED: "bg-[#e0e7ff] text-[#4338ca] border-[#c7d2fe]",
  CLOSED: "bg-surface-container text-on-surface-variant border-outline-variant",
};

export const PLAN_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  PAUSED: "Paused",
  COMPLETED: "Completed",
  CLOSED: "Closed",
};

export type PresetCard = (typeof PRESET_CARDS)[number];
```

---

### `features/plan/types.ts`

```ts
export type PlanSectionProps = {
  register: UseFormRegister<PlanFormValues>;
  control: Control<PlanFormValues>;
  errors: FieldErrors<PlanFormValues>;
};

export type Phase = {
  phase: string;
  weeks: number;
  label: string;
};

export type GoalDecision = {
  goalId: string;
  action: "CARRY_OVER" | "CLOSE" | "MODIFY";
  newDescription?: string;
  newHorizon?: "SHORT_TERM" | "LONG_TERM";
  newTargetAttainmentPct?: number;
};
```

---

### `features/plan/schema.ts`

Import from `@haber-final/api/schemas/plan` — do not redefine.

```ts
import {
  CreatePlanInput,
  ModificationDecisionInput,
  PlanPresetSchema,
} from "@haber-final/api/schemas/plan";

export const PlanFormSchema = CreatePlanInput.extend({
  // Relax presetId to not be required — preset selection is optional
  presetId: z.string().optional(),
  phases: z.array(z.object({
    phase: z.string(),
    weeks: z.number(),
    label: z.string(),
  })).default([]),
  targetMilestones: z.array(z.string()).default([]),
});

export const ModifyPlanFormSchema = z.object({
  changes: z.object({
    name: z.string().optional(),
    programLengthWeeks: z.number().optional(),
    phases: z.array(z.object({
      phase: z.string(),
      weeks: z.number(),
      label: z.string(),
    })).optional(),
    startDate: z.coerce.date().optional(),
    targetMilestones: z.array(z.string()).optional(),
    sessionDurationMinutes: z.number().optional(),
  }),
  goalDecisions: z.array(ModificationDecisionInput),
});

export type PlanFormValues = z.infer<typeof PlanFormSchema>;
export type ModifyPlanFormValues = z.infer<typeof ModifyPlanFormSchema>;
```

**`buildPlanDefaultValues({ preset })`:**
- If preset provided: `sessionDurationMinutes` from `preset.session_duration_minutes`, `name` = `preset.case_label`, `phases` from `preset.session_structure`
- Otherwise: `sessionDurationMinutes: 60`, empty phases array

---

### `features/plan/use-plan-data.ts`

```ts
export function usePlanData({ childId, planId }: { childId: string; planId?: string }) {
  const child = useQuery(trpc.child.get.queryOptions({ childId }));
  const plans = useQuery(trpc.plan.list.queryOptions({ childId }));
  const presets = useQuery(trpc.plan.listPresets.queryOptions());
  const activePlans = useQuery(trpc.plan.listActive.queryOptions({ childId }));

  const plan = useQuery(
    planId ? trpc.plan.get.queryOptions({ planId }) : { queryKey: ["unused"], queryFn: () => null },
    enabled: !!planId,
  );

  const sessionDuration = useQuery(
    planId ? trpc.plan.checkSessionDuration.queryOptions({ planId }) : { queryKey: ["unused"], queryFn: () => null },
    enabled: !!planId,
  );

  const isLoading = [child, plans, presets, activePlans, plan, sessionDuration]
    .some(q => q.isLoading);

  return { child, plans, presets, activePlans, plan, sessionDuration, isLoading };
}
```

---

### `features/plan/PresetCard.tsx`

```tsx
import { Button } from "@haber-final/ui/components/button";

type PresetCardProps = {
  preset: { preset_id: string; case_label: string; icon: string; description: string };
  selected?: boolean;
  onSelect: (presetId: string) => void;
};

export function PresetCard({ preset, selected, onSelect }: PresetCardProps) {
  return (
    <button
      onClick={() => onSelect(preset.preset_id)}
      className={cn(
        "flex flex-col items-start p-4 rounded-xl border text-left transition-all group",
        selected
          ? "bg-surface-container-lowest border-brown-500 shadow-md ring-1 ring-brown-500"
          : "bg-surface-container-lowest border-outline-variant hover:border-brown-400 hover:shadow-md",
      )}
    >
      <div className={cn(
        "w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center mb-3 transition-colors",
        selected ? "bg-brown-100 text-brown-600" : "text-brown-600 group-hover:bg-brown-100",
      )}>
        <span className="material-symbols-outlined">{preset.icon}</span>
      </div>
      <h4 className="font-medium text-on-surface text-sm">{preset.case_label}</h4>
      <p className="text-on-surface-variant text-xs mt-1 line-clamp-2">{preset.description}</p>
    </button>
  );
}
```

---

### `features/plan/DurationAdvisory.tsx`

```tsx
import { Alert, AlertDescription, AlertTitle } from "@haber-final/ui/components/alert";

type DurationAdvisoryProps = {
  totalMinutes: number;
  limitMinutes: number;
};

export function DurationAdvisory({ totalMinutes, limitMinutes }: DurationAdvisoryProps) {
  return (
    <Alert className="bg-warning/10 border-warning/30">
      <AlertTitle className="text-warning flex items-center gap-2">
        <span className="material-symbols-outlined text-sm">warning</span>
        Duration Mismatch
      </AlertTitle>
      <AlertDescription className="text-on-surface-variant text-sm">
        Total game time ({totalMinutes} min) exceeds session target duration ({limitMinutes} min).
        This is advisory only.
      </AlertDescription>
    </Alert>
  );
}
```

---

### `features/plan/PlanHeader.tsx`

```tsx
import { Badge } from "@haber-final/ui/components/badge";
import { PLAN_STATUS_COLORS, PLAN_STATUS_LABELS } from "./constants";

type PlanHeaderProps = {
  plan: { name: string; versionNumber: number; status: string; sessionDurationMinutes: number; startDate?: Date | null; projectedEndDate?: Date | null };
  childName?: string;
};

export function PlanHeader({ plan, childName }: PlanHeaderProps) {
  const statusClass = PLAN_STATUS_COLORS[plan.status] ?? PLAN_STATUS_COLORS.DRAFT;

  return (
    <section className="bg-surface-container-lowest rounded-xl p-6 border border-surface-container-highest shadow-sm">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-bold text-on-surface tracking-tight">{plan.name}</h1>
            <span className="bg-surface-container-highest text-on-surface px-2 py-0.5 rounded text-xs font-medium border border-outline-variant">
              v{plan.versionNumber}.0
            </span>
            <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium border", statusClass)}>
              {PLAN_STATUS_LABELS[plan.status]}
            </span>
          </div>
          {childName && (
            <p className="text-on-surface-variant text-sm mb-3">
              <span className="material-symbols-outlined text-sm align-middle">child_care</span>
              {" "}{childName}
            </p>
          )}
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <div className="flex items-center gap-2 text-on-surface-variant text-sm">
              <span className="material-symbols-outlined text-base">timer</span>
              <span>Session Target: <strong className="text-on-surface font-medium">{plan.sessionDurationMinutes}m</strong></span>
            </div>
            {plan.startDate && (
              <div className="flex items-center gap-2 text-on-surface-variant text-sm">
                <span className="material-symbols-outlined text-base">calendar_today</span>
                <span>Start: <strong className="text-on-surface font-medium">{formatDate(plan.startDate)}</strong></span>
              </div>
            )}
            {plan.projectedEndDate && (
              <div className="flex items-center gap-2 text-on-surface-variant text-sm">
                <span className="material-symbols-outlined text-base">event_busy</span>
                <span>Review: <strong className="text-on-surface font-medium">{formatDate(plan.projectedEndDate)}</strong></span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
```

---

### `features/plan/PlanLifecycleButtons.tsx`

```tsx
import { Button } from "@haber-final/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@haber-final/ui/components/dropdown-menu";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type PlanLifecycleButtonsProps = {
  plan: { id: string; status: string };
  onModify?: () => void;
};

export function PlanLifecycleButtons({ plan, onModify }: PlanLifecycleButtonsProps) {
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();

  const activate = useMutation(trpc.plan.activate.mutationOptions({
    onSuccess: () => {
      toast.success("Plan activated");
      queryClient.invalidateQueries({ queryKey: utils.plan.get.queryKey({ planId: plan.id }) });
    },
    onError: (err) => toast.error(err.message),
  }));

  const pause = useMutation(trpc.plan.pause.mutationOptions({ ... }));
  const resume = useMutation(trpc.plan.resume.mutationOptions({ ... }));
  const close = useMutation(trpc.plan.close.mutationOptions({
    onSuccess: () => {
      toast.success("Plan closed");
      queryClient.invalidateQueries({ queryKey: utils.plan.get.queryKey({ planId: plan.id }) });
    },
    onError: (err) => toast.error(err.message),
  }));
  const extend = useMutation(trpc.plan.extend.mutationOptions({ ... }));

  if (plan.status === "CLOSED") return null;

  return (
    <div className="flex flex-wrap gap-2">
      {plan.status === "DRAFT" && (
        <Button onClick={() => activate.mutate({ planId: plan.id })}>
          Activate
        </Button>
      )}
      {plan.status === "ACTIVE" && (
        <>
          <Button variant="outline" onClick={() => pause.mutate({ planId: plan.id })}>
            Pause
          </Button>
          <Button variant="outline" onClick={onModify}>
            Modify Plan
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Extend</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {[4, 6, 8, 12].map(w => (
                <DropdownMenuItem key={w} onClick={() => extend.mutate({ planId: plan.id, programLengthWeeks: w })}>
                  {w} weeks
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="destructive" onClick={() => /* open close dialog */}>
            Close
          </Button>
        </>
      )}
      {plan.status === "PAUSED" && (
        <>
          <Button onClick={() => resume.mutate({ planId: plan.id })}>
            Resume
          </Button>
          <Button variant="destructive" onClick={() => /* open close dialog */}>
            Close
          </Button>
        </>
      )}
    </div>
  );
}
```

---

### `features/plan/PhaseBuilder.tsx`

Draggable phase blocks with add/remove/reorder. Uses `react-dnd` or `@dnd-kit/core` for drag-and-drop.

```tsx
type PhaseBuilderProps = {
  control: Control<PlanFormValues>;
  phases: { phase: string; weeks: number; label: string }[];
  onChange: (phases: { phase: string; weeks: number; label: string }[]) => void;
};

export function PhaseBuilder({ control, phases, onChange }: PhaseBuilderProps) {
  const { fields, move, remove, insert } = useFieldArray({ control, name: "phases" });

  return (
    <div className="space-y-3">
      {fields.map((field, idx) => (
        <div
          key={field.id}
          className="bg-surface-container border border-brown-200 rounded-lg p-4 relative group"
          draggable
          onDragStart={() => /* handle drag start */}
          onDragOver={() => /* handle drag over */}
          onDrop={() => /* handle drop */}
        >
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-brown-500 rounded-l-lg" />
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-on-surface-variant cursor-grab active:cursor-grabbing text-lg">drag_indicator</span>
              <Input
                {...register(`phases.${idx}.label`)}
                className="font-medium bg-transparent border-b border-transparent hover:border-brown-300 focus:border-brown-600 focus:ring-0 px-0 py-0 w-48"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-surface px-2 py-1 rounded-md border border-outline-variant text-on-surface-variant">
                Weeks {phases[idx]?.weeks ?? 0}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(idx)}
                className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-danger"
              >
                <span className="material-symbols-outlined text-lg">delete</span>
              </Button>
            </div>
          </div>
          <div className="pl-8">
            <Textarea
              {...register(`phases.${idx}.description`)}
              placeholder="Describe the goals and methods for this phase..."
              rows={2}
              className="resize-none"
            />
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        className="w-full border-2 border-dashed border-brown-300 rounded-lg"
        onClick={() => insert(fields.length, { phase: `phase_${Date.now()}`, weeks: 4, label: `Phase ${fields.length + 1}`, description: "" })}
      >
        <span className="material-symbols-outlined">add_circle</span>
        Add Phase
      </Button>
    </div>
  );
}
```

---

### `features/plan/GameAssignmentsTable.tsx`

```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@haber-final/ui/components/table";
import { Button } from "@haber-final/ui/components/button";
import { Input } from "@haber-final/ui/components/input";
import { Controller } from "react-hook-form";

type GameAssignment = {
  id: string;
  gameVersion: { game: { name: string }; versionNumber: string };
  durationSeconds: number | null;
  repetitions: number | null;
  frequencyPerWeek: number | null;
  appliesToPhase: string | null;
};

type GameAssignmentsTableProps = {
  assignments: GameAssignment[];
  onEdit: (assignmentId: string) => void;
  onRemove: (assignmentId: string) => void;
  onAddGame: () => void;
  isLoading?: boolean;
};

export function GameAssignmentsTable({
  assignments,
  onEdit,
  onRemove,
  onAddGame,
  isLoading,
}: GameAssignmentsTableProps) {
  if (isLoading) return <GameAssignmentsTableSkeleton />;

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-surface-container-highest shadow-sm overflow-hidden">
      <div className="p-4 border-b border-surface-container-highest flex items-center justify-between bg-surface-container-low/50">
        <h2 className="font-medium text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">videogame_asset</span>
          Game Assignments
        </h2>
        <Button type="button" variant="ghost" size="sm" onClick={onAddGame} className="text-primary">
          <span className="material-symbols-outlined text-sm">add</span>
          Add Game
        </Button>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-surface-container-low border-b border-surface-container-highest">
              <TableHead className="uppercase text-xs">Game Name</TableHead>
              <TableHead className="uppercase text-xs">Ver</TableHead>
              <TableHead className="uppercase text-xs">Duration</TableHead>
              <TableHead className="uppercase text-xs">Reps/Wk</TableHead>
              <TableHead className="uppercase text-xs">Phase</TableHead>
              <TableHead className="text-right uppercase text-xs">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-surface-container-highest">
            {assignments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-on-surface-variant py-8">
                  No games assigned. Click "Add Game" to assign games to this plan.
                </TableCell>
              </TableRow>
            ) : (
              assignments.map((assignment) => (
                <TableRow key={assignment.id} className="hover:bg-surface-bright transition-colors group">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-brown-100 flex items-center justify-center text-brown-600">
                        <span className="material-symbols-outlined">extension</span>
                      </div>
                      <span className="font-medium text-on-surface text-sm">{assignment.gameVersion.game.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-on-surface-variant text-sm">{assignment.gameVersion.versionNumber}</TableCell>
                  <TableCell className="text-on-surface-variant text-sm">
                    {assignment.durationSeconds ? `${Math.round(assignment.durationSeconds / 60)} min` : "—"}
                  </TableCell>
                  <TableCell className="text-on-surface-variant text-sm">
                    {assignment.frequencyPerWeek ? `${assignment.frequencyPerWeek}x` : "—"}
                  </TableCell>
                  <TableCell>
                    {assignment.appliesToPhase ? (
                      <span className="bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded text-xs font-medium">
                        {assignment.appliesToPhase}
                      </span>
                    ) : (
                      <span className="text-on-surface-variant text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(assignment.id)}>
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(assignment.id)} className="text-danger hover:text-danger">
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {assignments.length > 0 && (
            <tfoot className="bg-surface-container-low">
              <TableRow>
                <TableCell colSpan={2} className="text-right font-medium text-on-surface text-sm">Total Duration:</TableCell>
                <TableCell className="font-bold text-warning text-sm">
                  {Math.round(assignments.reduce((sum, a) => sum + (a.durationSeconds ?? 0), 0) / 60)} min
                </TableCell>
                <TableCell colSpan={3} />
              </TableRow>
            </tfoot>
          )}
        </Table>
      </div>
    </div>
  );
}
```

---

### `features/plan/GoalSection.tsx`

```tsx
import { Progress } from "@haber-final/ui/components/progress";

type Goal = {
  id: string;
  description: string;
  horizon: "SHORT_TERM" | "LONG_TERM";
  targetAttainmentPct: number;
  currentAttainmentPct: number;
  status: "MET" | "IN_PROGRESS" | "NOT_MET" | "DISCONTINUED";
};

type GoalSectionProps = {
  goals: Goal[];
  isLoading?: boolean;
};

const STATUS_COLORS: Record<string, string> = {
  MET: "bg-[#dcfce7] text-[#15803d]",
  IN_PROGRESS: "bg-[#e0e7ff] text-[#4338ca]",
  NOT_MET: "bg-red-100 text-red-700",
  DISCONTINUED: "bg-surface-container text-on-surface-variant",
};

export function GoalSection({ goals, isLoading }: GoalSectionProps) {
  const activeGoals = goals.filter(g => g.status !== "DISCONTINUED");

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-surface-container-highest shadow-sm p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">flag</span>
          Clinical Goals
        </h2>
        <span className="text-xs bg-surface-container px-2 py-1 rounded text-on-surface-variant">
          {activeGoals.length} Active
        </span>
      </div>
      <div className="flex flex-col gap-4">
        {goals.length === 0 ? (
          <p className="text-on-surface-variant text-sm text-center py-4">No goals configured.</p>
        ) : (
          goals.map((goal) => (
            <div key={goal.id} className="flex flex-col gap-2">
              <div className="flex justify-between items-start gap-3">
                <p className={cn("text-sm font-medium", goal.status === "DISCONTINUED" && "line-through text-on-surface-variant")}>
                  {goal.description}
                </p>
                <span className={cn("px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap", STATUS_COLORS[goal.status])}>
                  {goal.status.replace("_", " ")}
                </span>
              </div>
              <Progress value={(goal.currentAttainmentPct / goal.targetAttainmentPct) * 100} className="h-2" />
              <div className="flex justify-between text-xs text-on-surface-variant">
                <span>Target: {goal.targetAttainmentPct}%</span>
                <span>Current: {goal.currentAttainmentPct}%</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

---

### `features/plan/GameLibraryBrowserSheet.tsx`

**Note:** This component is a stub if no `game.list` tRPC procedure exists. Once BE-10 adds game browsing, this should be replaced with a full implementation.

```tsx
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@haber-final/ui/components/sheet";
import { Button } from "@haber-final/ui/components/button";

type GameLibraryBrowserSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectGame: (gameVersionId: string) => void;
};

export function GameLibraryBrowserSheet({ open, onOpenChange, onSelectGame }: GameLibraryBrowserSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Game Library</SheetTitle>
          <SheetDescription>Select a game to add to this plan.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-4">videogame_asset_off</span>
          <p className="text-on-surface-variant text-sm">Game library browsing coming soon.</p>
          <p className="text-on-surface-variant text-xs mt-1">Contact your administrator to add games to plans.</p>
        </div>
        <SheetFooter className="flex-col gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
```

---

### `features/plan/ModifyPlanSheet.tsx`

```tsx
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@haber-final/ui/components/sheet";
import { Button } from "@haber-final/ui/components/button";
import { Input } from "@haber-final/ui/components/input";
import { Textarea } from "@haber-final/ui/components/textarea";
import { Controller, useForm, useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { ModifyPlanFormSchema, type ModifyPlanFormValues } from "./schema";
import { trpc } from "@/utils/trpc";

type ModifyPlanSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: { id: string; name: string; goals: Goal[]; gameAssignments: GameAssignment[] };
  onSuccess: (newPlanId: string) => void;
};

export function ModifyPlanSheet({ open, onOpenChange, plan, onSuccess }: ModifyPlanSheetProps) {
  const utils = trpc.useUtils();
  const form = useForm<ModifyPlanFormValues>({
    resolver: zodResolver(ModifyPlanFormSchema),
    defaultValues: {
      changes: { name: plan.name },
      goalDecisions: plan.goals.map(g => ({
        goalId: g.id,
        action: "CARRY_OVER" as const,
      })),
    },
  });

  const { fields: goalFields } = useFieldArray({ control: form.control, name: "goalDecisions" });

  const modify = useMutation(trpc.plan.modify.mutationOptions({
    onSuccess: (newPlan) => {
      toast.success("Plan modified — new version created");
      utils.plan.get.invalidate({ planId: plan.id });
      utils.plan.list.invalidate();
      onOpenChange(false);
      onSuccess(newPlan.id);
    },
    onError: (err) => toast.error(err.message),
  }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Modify Treatment Plan</SheetTitle>
          <SheetDescription>Update goals and game assignments for the upcoming period.</SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(v => modify.mutate({ planId: plan.id, ...v }))} className="space-y-6 mt-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-on-background flex items-center gap-2">
                <span className="material-symbols-outlined text-brown-500">flag</span>
                Clinical Goals
              </h3>
              <div className="space-y-3">
                {goalFields.map((field, idx) => {
                  const goal = plan.goals.find(g => g.id === field.goalId);
                  const action = form.watch(`goalDecisions.${idx}.action`);
                  return (
                    <div key={field.id} className={cn("rounded-lg p-4 border", action === "MODIFY" ? "bg-surface-container-low border-primary-container ring-1 ring-primary-container" : "bg-surface border-border")}>
                      <div className="flex justify-between items-start gap-3 mb-3">
                        <div>
                          <span className="inline-block px-2 py-0.5 bg-surface-container text-on-surface-variant rounded text-xs font-medium mb-1">
                            Goal {idx + 1}
                          </span>
                          <p className="text-sm font-medium text-on-background">{goal?.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" {...form.register(`goalDecisions.${idx}.action`)} value="CARRY_OVER" className="text-primary" />
                          <span className="text-sm">Continue</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" {...form.register(`goalDecisions.${idx}.action`)} value="MODIFY" className="text-primary" />
                          <span className="text-sm">Modify</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" {...form.register(`goalDecisions.${idx}.action`)} value="CLOSE" className="text-primary" />
                          <span className="text-sm">Discontinue</span>
                        </label>
                      </div>
                      {action === "MODIFY" && (
                        <div className="mt-3 pt-3 border-t border-outline-variant">
                          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Modified Goal Description</p>
                          <Textarea {...form.register(`goalDecisions.${idx}.newDescription`)} placeholder="Describe modification..." rows={2} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-on-background flex items-center gap-2">
                <span className="material-symbols-outlined text-brown-500">videogame_asset</span>
                Games
              </h3>
              <p className="text-sm text-on-surface-variant">
                {plan.gameAssignments.length} game(s) assigned. Games are copied to the new version.
              </p>
            </div>

            <SheetFooter className="flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={modify.isPending}>
                {modify.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
```

---

### Skeleton Components

**`features/plan/skeletons/PlanDetailSkeleton.tsx`**: Mirrors PlanDetailPage layout with `Skeleton` components for header, game table, goals, and lifecycle buttons.

**`features/plan/skeletons/PlanListSkeleton.tsx`**: Mirrors PlansListPage layout with `Skeleton` cards.

---

### `routes/_authenticated/children/$childId/plans/index.tsx` — PlansListPage

```ts
export const Route = createFileRoute("/_authenticated/children/$childId/plans/")({
  component: PlansListPage,
});

function PlansListPage() {
  const { childId } = Route.useParams();
  const { plans, activePlans, isLoading } = usePlanData({ childId });

  // Group plans by parentPlanId (version nesting)
  // Active plan highlighted, others muted
  // "New Plan" button linking to /children/$childId/plans/new

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="font-bold text-on-background">Treatment Plans</h1>
        <Button onClick={() => navigate({ to: "/children/$childId/plans/new", params: { childId } })}>
          <span className="material-symbols-outlined">add</span>
          New Plan
        </Button>
      </div>

      {isLoading ? (
        <PlanListSkeleton />
      ) : plans.length === 0 ? (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center text-on-surface-variant">
          No treatment plans yet. Create one to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Group plans by name (parent plan) */}
          {groupedPlans.map(group => (
            <div key={group.name} className="bg-surface-container-low rounded-xl border border-outline-variant p-4">
              <div className="flex justify-between items-center border-b border-outline-variant pb-3 mb-3">
                <h3 className="font-semibold text-brown-800">{group.name}</h3>
                <span className="text-xs bg-surface-container px-2 py-1 rounded text-on-surface-variant border border-outline-variant">
                  {group.versions.length} Version{group.versions.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {group.versions.map(version => (
                  <PlanVersionCard key={version.id} plan={version} isActive={version.isActive} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

### `routes/_authenticated/children/$childId/plans/new.tsx` — NewPlanPage

```ts
export const Route = createFileRoute("/_authenticated/children/$childId/plans/new")({
  component: NewPlanPage,
});

function NewPlanPage() {
  const { childId } = Route.useParams();
  const navigate = useNavigate();
  const { presets } = usePlanData({ childId });

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(PlanFormSchema),
    defaultValues: { childId, name: "", programLengthWeeks: 12, sessionDurationMinutes: 60, phases: [], targetMilestones: [] },
  });

  const create = useMutation(trpc.plan.create.mutationOptions({
    onSuccess: (plan) => navigate({ to: "/children/$childId/plans/$planId", params: { childId, planId: plan.id } }),
    onError: (err) => toast.error(err.message),
  }));

  const selectedPresetId = form.watch("presetId");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-on-background">Create Treatment Plan</h1>
          <p className="text-on-surface-variant text-sm">Design a comprehensive, phase-based intervention strategy.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Save Draft</Button>
          <Button onClick={form.handleSubmit(v => create.mutate(v))} disabled={create.isPending}>
            {create.isPending ? "Creating…" : "Publish Plan"}
          </Button>
        </div>
      </div>

      {/* Preset selector */}
      <div>
        <h3 className="font-medium text-on-background mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-brown-600">auto_awesome</span>
          Start with a Preset Template
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {PRESET_CARDS.map(preset => (
            <PresetCard
              key={preset.preset_id}
              preset={preset}
              selected={selectedPresetId === preset.preset_id}
              onSelect={(id) => {
                form.setValue("presetId", id);
                const found = presets.data?.find(p => p.preset_id === id);
                if (found) {
                  form.setValue("sessionDurationMinutes", found.session_duration_minutes);
                  form.setValue("name", found.case_label);
                  form.setValue("phases", found.session_structure.map(s => ({ phase: s.phase, weeks: s.minutes, label: s.label })));
                }
              }}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Plan Details */}
        <div className="lg:col-span-5">
          <SectionCard title="Plan Details">
            <div className="space-y-4">
              <FieldWrapper label="Plan Name" error={form.formState.errors.name?.message}>
                <Input {...form.register("name")} placeholder="e.g., Intensive Communication Protocol" />
              </FieldWrapper>
              <div className="grid grid-cols-2 gap-4">
                <FieldWrapper label="Length (Weeks)" error={form.formState.errors.programLengthWeeks?.message}>
                  <Input {...form.register("programLengthWeeks", { valueAsNumber: true })} type="number" min={1} max={52} />
                </FieldWrapper>
                <FieldWrapper label="Session Duration (Min)" error={form.formState.errors.sessionDurationMinutes?.message}>
                  <Input {...form.register("sessionDurationMinutes", { valueAsNumber: true })} type="number" min={15} step={15} />
                </FieldWrapper>
              </div>
              <FieldWrapper label="Target Start Date">
                <Input {...form.register("startDate", { valueAsDate: true })} type="date" />
              </FieldWrapper>
              <FieldWrapper label="Target Milestones">
                <MilestoneMultiSelect
                  value={form.watch("targetMilestones") ?? []}
                  onChange={(v) => form.setValue("targetMilestones", v)}
                />
              </FieldWrapper>
            </div>
          </SectionCard>
        </div>

        {/* Right: Phase Builder */}
        <div className="lg:col-span-7">
          <SectionCard
            title="Phase Builder"
            description="Break down the treatment into chronological stages."
            action={
              <Button type="button" variant="ghost" size="sm" onClick={() => {
                const phases = form.getValues("phases") ?? [];
                form.setValue("phases", [...phases, { phase: `phase_${Date.now()}`, weeks: 4, label: `Phase ${phases.length + 1}` }]);
              }}>
                <span className="material-symbols-outlined text-sm">add_circle</span>
                Add Phase
              </Button>
            }
          >
            <PhaseBuilder
              control={form.control}
              phases={form.watch("phases") ?? []}
              onChange={(phases) => form.setValue("phases", phases)}
            />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
```

---

### `routes/_authenticated/children/$childId/plans/$planId/index.tsx` — PlanDetailPage

```ts
export const Route = createFileRoute("/_authenticated/children/$childId/plans/$planId/")({
  component: PlanDetailPage,
});

function PlanDetailPage() {
  const { childId, planId } = Route.useParams();
  const navigate = useNavigate();
  const { child, plan, sessionDuration, isLoading } = usePlanData({ childId, planId });

  const [modifySheetOpen, setModifySheetOpen] = useState(false);
  const [addGameSheetOpen, setAddGameSheetOpen] = useState(false);

  const addGame = useMutation(trpc.plan.addGame.mutationOptions({
    onSuccess: () => {
      toast.success("Game added to plan");
      setAddGameSheetOpen(false);
      trpc.plan.get.invalidate({ planId });
      trpc.plan.checkSessionDuration.invalidate({ planId });
    },
    onError: (err) => toast.error(err.message),
  }));

  const removeGame = useMutation(trpc.plan.removeGame.mutationOptions({
    onSuccess: () => {
      toast.success("Game removed");
      trpc.plan.get.invalidate({ planId });
      trpc.plan.checkSessionDuration.invalidate({ planId });
    },
    onError: (err) => toast.error(err.message),
  }));

  if (isLoading) return <PlanDetailSkeleton />;
  if (!plan.data) return <div>Plan not found</div>;

  const planData = plan.data;
  const durationData = sessionDuration.data;

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <div className="flex items-center gap-2 text-sm">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/children/$childId/plans", params: { childId } })}>
          <ArrowLeft className="h-4 w-4" />
          Back to Plans
        </Button>
        <span className="text-on-surface-variant">/</span>
        <span className="text-on-surface font-medium">Plan Details</span>
      </div>

      <PlanHeader plan={planData} childName={child.data?.fullName} />

      {durationData?.exceeds && (
        <DurationAdvisory
          totalMinutes={Math.round(durationData.totalSeconds / 60)}
          limitMinutes={Math.round(durationData.limitSeconds / 60)}
        />
      )}

      <PlanLifecycleButtons
        plan={planData}
        onModify={() => setModifySheetOpen(true)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <GameAssignmentsTable
            assignments={planData.gameAssignments}
            onEdit={(id) => {/* inline edit or open edit sheet */}}
            onRemove={(id) => removeGame.mutate({ assignmentId: id })}
            onAddGame={() => setAddGameSheetOpen(true)}
          />
        </div>
        <div>
          <GoalSection goals={planData.goals} />
        </div>
      </div>

      <ModifyPlanSheet
        open={modifySheetOpen}
        onOpenChange={setModifySheetOpen}
        plan={planData}
        onSuccess={(newPlanId) => navigate({ to: "/children/$childId/plans/$planId", params: { childId, planId: newPlanId } })}
      />

      <GameLibraryBrowserSheet
        open={addGameSheetOpen}
        onOpenChange={setAddGameSheetOpen}
        onSelectGame={(gameVersionId) => addGame.mutate({ planId, gameVersionId })}
      />
    </div>
  );
}
```

---

### Update Child Profile Plans Tab

In `routes/_authenticated/children/$childId/index.tsx`, replace the placeholder:

```tsx
{/* Placeholder tabs */}
{(["assessments", "plans", "sessions"] as const).map((tab) => (
  <TabsContent key={tab} value={tab}>
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center text-on-surface-variant text-sm">
      {tab.charAt(0).toUpperCase() + tab.slice(1)} coming soon.
    </div>
  </TabsContent>
))}
```

With:

```tsx
<TabsContent value="plans">
  <div className="space-y-4">
    <div className="flex justify-end">
      <Button
        size="sm"
        onClick={() => router.navigate({ to: "/children/$childId/plans", params: { childId } })}
      >
        <span className="material-symbols-outlined text-sm">add</span>
        New Plan
      </Button>
    </div>
    <PlansListContent childId={childId} />
  </div>
</TabsContent>
```

Where `PlansListContent` is either a direct embed or a shared component used by both the tab and the plans index page.

---

## Duration Advisory — Full Data Flow

| Phase | Location | What happens |
|---|---|---|
| Store | `plan.checkSessionDuration` query | Returns `{ totalSeconds, limitSeconds, exceeds }` |
| Display | `PlanDetailPage` | Renders `<DurationAdvisory>` when `exceeds: true` |
| Trigger | After `addGame` or `removeGame` mutation | Invalidates `checkSessionDuration` query |

---

## tRPC Hooks Used

| Hook | Purpose |
|---|---|
| `trpc.plan.listPresets.useQuery()` | Load 5 preset options for NewPlanPage |
| `trpc.plan.create.useMutation()` | Create new plan from NewPlanPage |
| `trpc.plan.get.useQuery()` | Load plan detail for PlanDetailPage |
| `trpc.plan.list.useQuery()` | Load all plans for PlansListPage |
| `trpc.plan.listActive.useQuery()` | Determine if child has active plan |
| `trpc.plan.addGame.useMutation()` | Add game from GameLibraryBrowserSheet |
| `trpc.plan.removeGame.useMutation()` | Remove game from GameAssignmentsTable |
| `trpc.plan.checkSessionDuration.useQuery()` | Check if total game time exceeds session limit |
| `trpc.plan.activate.useMutation()` | Activate DRAFT/PAUSED plan |
| `trpc.plan.pause.useMutation()` | Pause ACTIVE plan |
| `trpc.plan.resume.useMutation()` | Resume PAUSED plan |
| `trpc.plan.extend.useMutation()` | Extend plan by N weeks |
| `trpc.plan.close.useMutation()` | Close plan with reason/summary |
| `trpc.plan.modify.useMutation()` | Create new plan version from ModifyPlanSheet |
| `trpc.child.get.useQuery()` | Load child name for header |

---

## Verification

1. `pnpm check-types` — must pass across all packages (explicit AC)
2. `pnpm check` — Biome on all new/edited files
3. **Plans list smoke test** (`/children/:childId/plans`):
   - Empty state when no plans exist
   - Plans grouped by name with version nesting
   - Active plan highlighted with green badge
   - Other versions muted with appropriate status badges
   - "New Plan" button navigates to creation form
4. **New plan smoke test** (`/children/:childId/plans/new`):
   - 5 preset cards render; selecting one pre-fills name, session duration, and phases
   - Phase builder add/remove works
   - Milestone multi-select works
   - Submit creates plan and redirects to detail page
5. **Plan detail smoke test** (`/children/:childId/plans/:planId`):
   - Header shows plan name, version badge, status badge, dates, session duration
   - Game assignments table shows games with edit/remove actions on hover
   - Duration advisory appears when total exceeds session duration
   - Goal section shows goals with progress bars and status badges
   - Lifecycle buttons appear based on plan status
   - "Add Game" opens GameLibraryBrowserSheet (stubbed if no game router)
   - "Modify Plan" opens ModifyPlanSheet
6. **Modify plan smoke test**:
   - Goal decisions radio buttons work (Continue/Modify/Discontinue)
   - "Modify" shows inline description editor
   - "Discontinue" marks goal for removal in new version
   - Submit creates new plan version and redirects to new plan detail
7. **Child profile plans tab** (`/children/:childId` → Plans tab):
   - Shows plan list inline
   - "New Plan" button visible and navigates correctly

---

## Blockers to Resolve Before/during Implementation

1. **Game library**: No `game.list` tRPC procedure exists. `GameLibraryBrowserSheet` must be stubbed. If a game router is added during FE-05 development, replace the stub with full implementation.
2. **Child profile FE-02**: The Plans tab currently shows a placeholder. Implementation of this feature should include updating the child profile page to show actual plan list inline, not just the placeholder.
