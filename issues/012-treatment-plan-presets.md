# 012 — Treatment Plan Presets [AFK]

**Type:** AFK  
**PRD User Stories:** 93–95

## What to build

Expose the five clinical treatment plan presets (ASD, CP-Spastic-Diplegia, ADHD, Down Syndrome, DCD/Dyspraxia) stored in `clinical-data/treatment-plan-presets.json` as an API. Doctors can browse presets and clone one as the starting point for a new per-student plan. Once cloned, the plan is fully editable and diverges immediately from the preset — no live link is maintained. The `source_preset_id` is recorded on the plan for analytics only.

## Acceptance criteria

**Schema / migrations**
- [ ] No new DB tables — presets are loaded from `clinical-data/treatment-plan-presets.json` at server boot and held in memory by `PlanPresetService`
- [ ] `TreatmentPlan.sourcePresetId` (nullable string — e.g. `"asd_sensory_processing"`) already added in issue 011; this issue wires it up
- [ ] `TreatmentPlan.sessionStructure` (JSONB nullable) — stores the preset's ordered `{ phase, minutes, label }` blocks as a default in-session phasing guide (not timed by the watchdog, purely informational)

**API endpoints**
- [ ] `GET /treatment-plan-presets` — returns all 5 presets as a list: `{ id, label, diagnosisLabel, description, sessionDurationMinutes, sessionStructure, shortTermGoalTemplates[], longTermGoalTemplates[], equipmentList[], recommendedGamesCategories[] }`
- [ ] `GET /treatment-plan-presets/:presetId` — full preset detail
- [ ] `POST /treatment-plans/from-preset` — doctor only: `{ studentId, presetId, startDate, name? }` — clones the preset into a new draft `TreatmentPlan` with all preset values pre-populated (session duration, session structure, goals, equipment, game category recommendations); `sourcePresetId` recorded; returns the new plan; after cloning the plan is a regular editable `TreatmentPlan` with no live link to the preset

**Frontend**
- [ ] "Start from Preset" option on the Create Treatment Plan entry point (alongside "Start Blank")
- [ ] Preset picker: card grid of 5 presets, each showing the case label, description, and typical session duration; clicking one previews its pre-populated goals and session structure
- [ ] After selecting a preset, a confirmation step shows: "This will pre-fill your plan with [preset name] defaults. You can edit everything after creation." → "Create & Edit"
- [ ] After plan creation from preset: the plan builder opens with all preset fields pre-populated and an informational banner: "Started from [preset name] preset — fully editable"

**Tests**
- [ ] `GET /treatment-plan-presets` returns exactly 5 entries
- [ ] `POST /treatment-plans/from-preset` with `presetId: 'asd_sensory_processing'` → new plan has `sourcePresetId: 'asd_sensory_processing'`, `sessionDurationMinutes` from preset, goals pre-populated
- [ ] Modifying the cloned plan's session duration does not change the preset JSON
- [ ] `POST /treatment-plans/from-preset` → `POST /treatment-plans/:id/modify` → new version does NOT carry `sourcePresetId` (it's only on the first version)
- [ ] Accessing a non-existent `presetId` returns 404
- [ ] Cloned plan `sessionStructure` matches the preset's `session_structure` array

## QA / Manual testing

- [ ] Log in as doctor → open a student → click "Create Treatment Plan" → select "Start from Preset" → browse the 5 presets → select "ASD with Sensory Processing"
- [ ] Preview shows short-term and long-term goal templates, equipment list, session duration → click "Create & Edit"
- [ ] Verify plan builder opens with preset values pre-filled and the "Started from ASD preset" banner visible
- [ ] Change the session duration from the preset default to 45 min → save → verify the change is persisted without affecting the preset
- [ ] Create a second plan for a different student from the same preset → verify both plans are independent (changing one doesn't change the other)

## Blocked by

- Issue 011 — Treatment Plan Builder & Lifecycle
