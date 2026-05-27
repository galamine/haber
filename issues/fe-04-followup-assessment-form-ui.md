# FE-04: Follow-Up Assessment Form 2 UI

## What to build

Build the follow-up assessment (Form 2) UI. Conducted every 4–6 sessions or when clinically indicated. Pre-populates from the initial assessment baseline for sensory and goal sections.

**Package:** `packages/client`

Reference file: `clinical-data/follow-up-assessment.example.json`

### Routes to add

```
/dashboard/children/:id/followup/new            → NewFollowUpPage
/dashboard/children/:id/followup/:followUpId    → FollowUpDetailPage
```

### Section breakdown

**Section A — Session Info:**
- Date, therapist (auto-filled), session number (auto-computed from plan), weeks since initial assessment (auto-computed), parent/caregiver present toggle

**Section B — Goal Progress Review:**
- Lists all active goals from the current treatment plan
- Per goal: attainment % slider (0–100), status selector (Met / In Progress / Not Met), evidence notes textarea
- Uses existing `Goal` data from `goal.list`

**Section C — Sensory Progress Check:**
- Same 7 system rows as Form 1 Section D
- Pre-filled with the baseline ratings from the initial assessment (greyed out baseline column)
- Editable current rating column (1–5 slider)
- Auto-computed change delta shown inline: `+2`, `-1`, `0` with colour coding (green/red/grey)

**Section D — Follow-Up Clinical Questions:**
- Improvements at home/school: textarea
- New concerns / regressions: textarea
- Home program compliance: radio group (Excellent / Good / Partial / Minimal / Not started)
- Child engagement & tolerance: radio group (Excellent / Good / Fair / Poor)
- School performance changes, behaviour changes, new skills observed: textareas
- Equipment effectively used: multi-select from taxonomy
- Therapist clinical observations: textarea

**Section E — Plan Adjustment & Next Steps:**
- Goal status decisions: multi-checkbox (continue all / modify existing / add new / discontinue / refer to specialist)
- Updated goals for next period: repeatable text inputs
- Updated home program / sensory diet: textarea
- Next follow-up date: date picker
- Next assessment type: select
- Clinical notes for team/supervisor: textarea

**Section F — Signatures:**
- Same pattern as Form 1 Section H

### Pre-population

When `NewFollowUpPage` loads:
- Fetch initial assessment to pre-populate Section C baseline column
- Fetch active plan goals to pre-populate Section B goal list

### tRPC hooks used

- `api.assessment.createFollowUp.useMutation()`
- `api.assessment.getFollowUp.useQuery()`
- `api.goal.list.useQuery()`
- `api.assessment.getFollowUpDelta.useQuery()`

## Acceptance criteria

- [ ] Section B lists all active goals; attainment slider and status selector work
- [ ] Section C shows baseline rating (readonly) and current rating (editable) side by side; delta is shown after entering current rating
- [ ] Section D radio groups render correctly; selection is stored
- [ ] Section F requires both signatures before submission
- [ ] Submitted follow-up appears in `FollowUpDetailPage` in read-only mode with sensory delta visible
- [ ] `pnpm --filter client typecheck` passes

## Blocked by

- BE-08 (Follow-up assessment API)
- FE-03 (Initial assessment must exist for baseline pre-population)
