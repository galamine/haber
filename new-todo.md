# Haber Platform Development Backlog & Technical Specification (`new-todo.md`)

> **Target Audience:** Software Engineering Team (Fullstack, Web Frontend, Hono Backend, Prisma DB).  
> **Note:** This document is **NOT** for game engine / Phaser developers. It contains requirements for the **Haber platform application**, API routes, database schemas, clinician workflows, session creation, and telemetry ingestion.

---

## Table of Contents
1. [Platform Workflows & Clinical Features](#1-platform-workflows--clinical-features)
   - [Child Intake, Assessment & Treatment Plan](#11-child-intake-assessment--treatment-plan)
   - [Treatment Plan Details (Length in Months & Duration Removal)](#12-treatment-plan-details)
   - [Goal Presets Management](#13-goals-presets)
   - [Game Library & Clinic-Level Categories](#14-game-library--custom-categories)
   - [Session Creation & Time Picker Improvements](#15-session-creation--time-picker)
   - [Game Preview Functionality](#16-game-preview)
2. [Game Catalog Modernization (Software Developer Spec)](#2-game-catalog-modernization-software-developer-spec)
   - [Developer Invariants (Key Immutability)](#21-developer-invariants)
   - [The 10 Official Clinical Domains](#22-the-10-official-clinical-domains)
   - [Master 53-Game Catalog Register (R01–R53)](#23-master-53-game-catalog-register)
3. [Telemetry & Results Ingestion Engine](#3-telemetry--results-ingestion-engine)
   - [Fixing the Session Dash (`—`) for Trail Games](#31-fixing-the-session-dash--)
   - [Fixing the `Level N/A` Badge in the UI](#32-fixing-the-level-na-badge)
   - [Multi-Game Session Result Architecture](#33-multi-game-session-result-architecture)
4. [Execution Checklist & Verification Gates](#4-execution-checklist--verification-gates)

---

## 1. Platform Workflows & Clinical Features

### 1.1 Child Intake, Assessment & Treatment Plan
*Primary Files:*
- Intake Form: [`apps/web/src/routes/_authenticated/children/new.tsx`](file:///c:/workspace/galamine/haber/apps/web/src/routes/_authenticated/children/new.tsx)
- Assessment Routes: [`apps/web/src/routes/_authenticated/children/$childId/assessment/`](file:///c:/workspace/galamine/haber/apps/web/src/routes/_authenticated/children/$childId/assessment/)
- Plan Creation: [`apps/web/src/routes/_authenticated/children/$childId/plans/new.tsx`](file:///c:/workspace/galamine/haber/apps/web/src/routes/_authenticated/children/$childId/plans/new.tsx)

- [ ] **Simplify Child Intake:**
  - Audit all fields in `new.tsx` (OP Number, guardian details, medical history, language, school).
  - Eliminate redundant or rarely used fields; make non-critical clinical history optional.
  - Collapse guardian contact and secondary information into clean, progressive disclosure accordions.
- [ ] **Streamline Initial & Follow-up Assessments:**
  - Audit Assessment Sections A through H in [`packages/db/prisma/schema/clinical.prisma`](file:///c:/workspace/galamine/haber/packages/db/prisma/schema/clinical.prisma#L89-L108).
  - Simplify repetitive input tables; pre-fill historical defaults where available.
  - Allow clinicians to bypass non-applicable developmental sections without blocking plan creation.

---

### 1.2 Treatment Plan Details
*Primary Files:*
- Prisma Schema: [`packages/db/prisma/schema/plans.prisma`](file:///c:/workspace/galamine/haber/packages/db/prisma/schema/plans.prisma#L20-L45)
- Plan tRPC Router & Schemas: [`packages/api/src/routers/plan.ts`](file:///c:/workspace/galamine/haber/packages/api/src/routers/plan.ts) & `packages/api/src/schemas/plan.ts`
- Frontend Plan Form: [`apps/web/src/routes/_authenticated/children/$childId/plans/new.tsx`](file:///c:/workspace/galamine/haber/apps/web/src/routes/_authenticated/children/$childId/plans/new.tsx#L123-L128)

- [ ] **Update Duration Unit:**
  - Replace `programLengthWeeks` (Weeks) with **Plan Length (in Months)**.
  - Migrate database column to `programLengthMonths Int` (or provide automatic conversion UI: `months = weeks / 4`).
  - Update frontend input from `"Length (Weeks)"` to `"Plan Length (Months)"`.
- [ ] **Remove Session Duration from Treatment Plan:**
  - Delete `sessionDurationMinutes` from the `TreatmentPlan` creation form and model.
  - Session durations are naturally configured per individual session during session scheduling, not locked globally into the treatment plan definition.

---

### 1.3 Goals Presets
*Primary Files:*
- Prisma Schema: [`packages/db/prisma/schema/plans.prisma`](file:///c:/workspace/galamine/haber/packages/db/prisma/schema/plans.prisma)
- API Router: Create `packages/api/src/routers/goalPreset.ts`
- Web UI: Goal presets management tab in settings/clinical config

- [ ] **Database Model:**
  - Create `GoalPreset` model in Prisma:
    ```prisma
    model GoalPreset {
      id          String      @id @default(cuid())
      clinicId    String?     // null = global system preset, string = clinic-specific
      title       String
      description String
      category    String?     // e.g., Motor Skills, Attention & Focus
      horizon     GoalHorizon @default(SHORT_TERM)
      targetAttainmentPct Int @default(100)
      createdAt   DateTime    @default(now())
      updatedAt   DateTime    @updatedAt
      clinic      Clinic?     @relation(fields: [clinicId], references: [id])

      @@map("goal_preset")
    }
    ```
- [ ] **tRPC Procedures:**
  - `goalPreset.list`: List presets available to the current user's clinic (global + clinic-specific).
  - `goalPreset.create`: Allow clinic admins to define custom goal templates.
  - `goalPreset.update` / `goalPreset.delete`: Manage clinic presets.
- [ ] **Frontend Integration:**
  - In [`plans/new.tsx`](file:///c:/workspace/galamine/haber/apps/web/src/routes/_authenticated/children/$childId/plans/new.tsx), add a searchable dropdown/combobox to quickly insert pre-configured goals into the treatment plan with one click.

---

### 1.4 Game Library & Custom Categories
*Primary Files:*
- Library Views: [`apps/web/src/components/game-library/`](file:///c:/workspace/galamine/haber/apps/web/src/components/game-library/)
- Categories Router: [`packages/api/src/routers/game.ts`](file:///c:/workspace/galamine/haber/packages/api/src/routers/game.ts)
- Game Category Schema: [`packages/db/prisma/schema/plans.prisma`](file:///c:/workspace/galamine/haber/packages/db/prisma/schema/plans.prisma#L101-L110)

- [ ] **Category-Based Filtering:**
  - Add category filter tabs / pills in [`GameLibrarySidebar.tsx`](file:///c:/workspace/galamine/haber/apps/web/src/components/game-library/GameLibrarySidebar.tsx) and [`GamePickerSheet.tsx`](file:///c:/workspace/galamine/haber/apps/web/src/features/session/GamePickerSheet.tsx).
- [ ] **Clinic-Level Custom Categories:**
  - Enable `GameCategory.clinicId` to store custom categories created by a specific clinic.
  - Ensure query `gameCategory.list` returns both global platform categories and categories belonging to the user's `tenantId`.
  - Ensure all staff members within that clinic can view and filter by these categories.
- [ ] **Fix Editing Selected Games in Session Creation:**
  - In [`CreateSessionSheet.tsx`](file:///c:/workspace/galamine/haber/apps/web/src/features/session/CreateSessionSheet.tsx#L245-L254), when a game is already selected, clicking it currently wipes the form in `GamePickerSheet`.
  - Pass the current `game` state (`durationSeconds`, `repetitions`, `instructions`) into `GamePickerSheet` as `initialValues` so the therapist can view and edit their settings without re-picking the game from scratch.

---

### 1.5 Session Creation & Time Picker
*Primary Files:*
- Session Sheet: [`apps/web/src/features/session/CreateSessionSheet.tsx`](file:///c:/workspace/galamine/haber/apps/web/src/features/session/CreateSessionSheet.tsx)
- Time Picker Component: [`apps/web/src/components/time-picker.tsx`](file:///c:/workspace/galamine/haber/apps/web/src/components/time-picker.tsx)

- [ ] **In-Flow Category Selection & Creation:**
  - In `CreateSessionSheet`, allow therapists to categorize the session on the fly.
  - Provide a combobox allowing them to select an existing category or type a new name to create a category instantly.
- [ ] **Simplify Time Selection:**
  - Replace the multi-scroll wheel / complex time-picker with a clean, ergonomic selector:
    - Standard native HTML5 `<input type="time" step="900" />` (15-minute intervals), OR
    - Clean dropdown list of 15/30-minute time slots (e.g., `09:00 AM`, `09:15 AM`, `09:30 AM`).

---

### 1.6 Game Preview
*Primary Files:*
- Detail Sheet: [`apps/web/src/components/game-library/GameDetailSheet.tsx`](file:///c:/workspace/galamine/haber/apps/web/src/components/game-library/GameDetailSheet.tsx)
- Game Versions: [`packages/db/prisma/game-registry/`](file:///c:/workspace/galamine/haber/packages/db/prisma/game-registry/)

- [ ] **Add Game Preview Launcher:**
  - In `GameDetailSheet.tsx`, add a visible **"Preview Game"** action button.
  - Launch an interactive modal dialog with an embedded `<iframe>` pointing to the game's test URL (`version.path`), enabling clinicians to test gameplay directly from the browser dashboard.
  - Provide a "Full Screen Preview" option for projector simulation.

---

## 2. Game Catalog Modernization (Software Developer Spec)

### 2.1 Developer Invariants
1. **Never alter the internal key / `name` property** in the game registry files (`catch-pop-games.ts`, `selection-games.ts`, `trail-draw-reveal-sensory-games.ts`).
2. **Only update user-facing `title` and `description`** so existing database references, past sessions, and URL paths remain 100% stable.
3. Clean all internal developer tags (e.g., `[1-3 Color Reaction Step]`) out of descriptions.

---

### 2.2 The 10 Official Clinical Domains
Replace the legacy disk-folder categories (`trail-games`, `pop-games`, `selection_game`) with the 10 official clinical domains in [`seed-games.ts`](file:///c:/workspace/galamine/haber/packages/db/prisma/seed-games.ts):

| Domain # | Domain Name | Description & Use in Haber Platform |
| :---: | :--- | :--- |
| **1** | `Motor Skills` | Gross motor movement, directed stepping, sweeping, erasing, physical reaction. |
| **2** | `Cognitive Processing` | Shape/size logic, odd-one-out discrimination, object matching, picture-to-word quizzes. |
| **3** | `Attention & Focus` | Distractor suppression, selective attention, cue monitoring. |
| **4** | `Memory & Learning` | Recall tasks, sequence following, working memory. |
| **5** | `Balance & Coordination` | Interception timing (`Basket Apple Catch`), targeted precision stepping. |
| **6** | `Communication & Language` | Yes/No responses, sentence completions, vocabulary matching. |
| **7** | `Sensory Processing` | Auditory localization, visual texture matching, interactive particle trails *(provisional)*. |
| **8** | `Emotional Regulation` | Facial expression identification (`Emotion Match`). |
| **9** | `Social Interaction` | Collaborative / multi-participant activities. |
| **10** | `Daily Living Skills` | Functional everyday tasks and routines. |

---

### 2.3 Master 53-Game Catalog Register

Below are the exact 53 games to update in [`packages/db/prisma/game-registry/`](file:///c:/workspace/galamine/haber/packages/db/prisma/game-registry):

#### Trace Walk & Paint (R01–R04)
*File:* `trail-draw-reveal-sensory-games.ts`

- [x] **R01 | Key: `trace-walk-shapes`**
  - **Proposed Title:** `Shape Trace Walk`
  - **Proposed Description:** *"Move your feet over a shape to fill it with colour. Practise directing your movement towards a visible target."*
  - **Primary Domain:** `Motor Skills` | **Secondary:** `Balance & Coordination`
- [x] **R02 | Key: `trace-walk-alphabet`**
  - **Proposed Title:** `Letter Trace Walk`
  - **Proposed Description:** *"Move your feet over a letter to fill it with colour. Practise directing your movement towards a visible target."*
  - **Primary Domain:** `Motor Skills` | **Secondary:** `Balance & Coordination`
- [x] **R03 | Key: `trace-walk-number`**
  - **Proposed Title:** `Number Trace Walk`
  - **Proposed Description:** *"Move your feet over a number to fill it with colour. Practise directing your movement towards a visible target."*
  - **Primary Domain:** `Motor Skills` | **Secondary:** `Balance & Coordination`
- [x] **R04 | Key: `paint-floor`**
  - **Proposed Title:** `Walk & Paint`
  - **Proposed Description:** *"Move your feet to paint pictures and patterns. Choose colours and brushes for open-ended creative movement."*
  - **Primary Domain:** `Motor Skills` | **Secondary:** `Sensory Processing` *(provisional)*

#### Sensory Particle Trails (R05–R24)
*File:* `trail-draw-reveal-sensory-games.ts`  
*All 20 games use the shared particle emitter engine. All have:*  
*Primary Domain:* `Sensory Processing` *(provisional)* | *Secondary Domain:* `Motor Skills`

- [x] **R05 | Key: `trail-confetti`** -> **Title:** `Confetti Trail`  
  *Description:* *"Move your feet to create the confetti trail effect across the floor. Explore how your movement changes the visual display."*
- [x] **R06 | Key: `trail-flower-garden`** -> **Title:** `Petal Trail`  
  *Description:* *"Move your feet to create the petal trail effect across the floor. Explore how your movement changes the visual display."*
- [x] **R07 | Key: `trail-ice-crystal`** -> **Title:** `Ice Crystal Trail`  
  *Description:* *"Move your feet to create the ice crystal trail effect across the floor. Explore how your movement changes the visual display."*
- [x] **R08 | Key: `trail-underwater-bubble`** -> **Title:** `Underwater Bubble Trail`  
  *Description:* *"Move your feet to create the underwater bubble trail effect across the floor. Explore how your movement changes the visual display."*
- [x] **R09 | Key: `trail-firework`** -> **Title:** `Firework Spark Trail`  
  *Description:* *"Move your feet to create the firework spark trail effect across the floor. Explore how your movement changes the visual display."*
- [x] **R10 | Key: `trail-teddy-print`** -> **Title:** `Teddy Paw Trail`  
  *Description:* *"Move your feet to create the teddy paw trail effect across the floor. Explore how your movement changes the visual display."*
- [x] **R11 | Key: `trail-candy-drop`** -> **Title:** `Candy Drop Trail`  
  *Description:* *"Move your feet to create the candy drop trail effect across the floor. Explore how your movement changes the visual display."*
- [x] **R12 | Key: `trail-cloud-puff`** -> **Title:** `Cloud Puff Trail`  
  *Description:* *"Move your feet to create the cloud puff trail effect across the floor. Explore how your movement changes the visual display."*
- [x] **R13 | Key: `trail-rainbow-swirl`** -> **Title:** `Rainbow Star Trail`  
  *Description:* *"Move your feet to create the rainbow star trail effect across the floor. Explore how your movement changes the visual display."*
- [x] **R14 | Key: `trail-heart`** -> **Title:** `Floating Heart Trail`  
  *Description:* *"Move your feet to create the floating heart trail effect across the floor. Explore how your movement changes the visual display."*
- [x] **R15 | Key: `trail-rainbow-lines`** -> **Title:** `Rainbow Ribbon Trail`  
  *Description:* *"Move your feet to create the rainbow ribbon trail effect across the floor. Explore how your movement changes the visual display."*
- [x] **R16 | Key: `trail-firefly`** -> **Title:** `Firefly Glow Trail`  
  *Description:* *"Move your feet to create the firefly glow trail effect across the floor. Explore how your movement changes the visual display."*
- [x] **R17 | Key: `trail-glitter`** -> **Title:** `Diamond Glitter Trail`  
  *Description:* *"Move your feet to create the diamond glitter trail effect across the floor. Explore how your movement changes the visual display."*
- [x] **R18 | Key: `trail-bubble`** -> **Title:** `Soap Bubble Trail`  
  *Description:* *"Move your feet to create the soap bubble trail effect across the floor. Explore how your movement changes the visual display."*
- [x] **R19 | Key: `trail-galaxy`** -> **Title:** `Galaxy Swirl Trail`  
  *Description:* *"Move your feet to create the galaxy swirl trail effect across the floor. Explore how your movement changes the visual display."*
- [x] **R20 | Key: `trail-magic-sparkle`** -> **Title:** `Magic Star Trail`  
  *Description:* *"Move your feet to create the magic star trail effect across the floor. Explore how your movement changes the visual display."*
- [x] **R21 | Key: `trail-ember`** -> **Title:** `Ember Glow Trail`  
  *Description:* *"Move your feet to create the ember glow trail effect across the floor. Explore how your movement changes the visual display."*
- [x] **R22 | Key: `trail-snow`** -> **Title:** `Snowfall Trail`  
  *Description:* *"Move your feet to create the snowfall trail effect across the floor. Explore how your movement changes the visual display."*
- [x] **R23 | Key: `trail-paint`** -> **Title:** `Paint Splatter Trail`  
  *Description:* *"Move your feet to create the paint splatter trail effect across the floor. Explore how your movement changes the visual display."*
- [x] **R24 | Key: `trail-stardust`** -> **Title:** `Falling Stardust Trail`  
  *Description:* *"Move your feet to create the falling stardust trail effect across the floor. Explore how your movement changes the visual display."*

#### Physical Sweeps, Reveal & Guess, and Picture Reveals (R25–R35)
*File:* `trail-draw-reveal-sensory-games.ts`

- [x] **R25 | Key: `water-walk`** -> **Title:** `Ripple Walk`  
  *Description:* *"Move your feet to create ripples in the water display. Explore controlled movement and its visible effects."*  
  *Primary:* `Motor Skills` | *Secondary:* `Sensory Processing`
- [x] **R26 | Key: `scatter-leaf`** -> **Title:** `Autumn Leaf Sweep`  
  *Description:* *"Move your feet to push aside the displayed leaves. Explore controlled movement and its visible effects."*  
  *Primary:* `Motor Skills` | *Secondary:* `Sensory Processing`
- [x] **R27 | Key: `scatter-shells`** -> **Title:** `Seashell Sweep`  
  *Description:* *"Move your feet to push aside the displayed shells. Explore controlled movement and its visible effects."*  
  *Primary:* `Motor Skills` | *Secondary:* `Sensory Processing`
- [x] **R28 | Key: `scatter-fruit`** -> **Title:** `Fruit Sweep`  
  *Description:* *"Move your feet to push aside the displayed fruit. Explore controlled movement and its visible effects."*  
  *Primary:* `Motor Skills` | *Secondary:* `Sensory Processing`
- [x] **R29 | Key: `guess-fruits`** -> **Title:** `Reveal & Guess: Fruit`  
  *Description:* *"Move your feet to uncover a hidden picture of fruit. Choose its name from three options as the picture appears. Practise recognising pictures while controlling your movements."*  
  *Primary:* `Cognitive Processing` | *Secondary:* `Communication & Language`, `Motor Skills`
- [x] **R30 | Key: `guess-animals`** -> **Title:** `Reveal & Guess: Animals`  
  *Description:* *"Move your feet to uncover a hidden picture of animals. Choose its name from three options as the picture appears. Practise recognising pictures while controlling your movements."*  
  *Primary:* `Cognitive Processing` | *Secondary:* `Communication & Language`, `Motor Skills`
- [x] **R31 | Key: `reveal-flowers`** -> **Title:** `Flower Picture Reveal`  
  *Description:* *"Move your feet to uncover a hidden picture of flowers. Practise directing movement to uncover more of the picture."*  
  *Primary:* `Motor Skills` | *Secondary:* `Sensory Processing`
- [x] **R32 | Key: `reveal-birds`** -> **Title:** `Bird Picture Reveal`  
  *Description:* *"Move your feet to uncover a hidden picture of birds. Practise directing movement to uncover more of the picture."*  
  *Primary:* `Motor Skills` | *Secondary:* `Sensory Processing`
- [x] **R33 | Key: `reveal-fruits`** -> **Title:** `Fruit Picture Reveal`  
  *Description:* *"Move your feet to uncover a hidden picture of fruit. Practise directing movement to uncover more of the picture."*  
  *Primary:* `Motor Skills` | *Secondary:* `Sensory Processing`
- [x] **R34 | Key: `reveal-vehicles`** -> **Title:** `Vehicle Picture Reveal`  
  *Description:* *"Move your feet to uncover a hidden picture of vehicles. Practise directing movement to uncover more of the picture."*  
  *Primary:* `Motor Skills` | *Secondary:* `Sensory Processing`
- [x] **R35 | Key: `reveal-animals`** -> **Title:** `Animal Picture Reveal`  
  *Description:* *"Move your feet to uncover a hidden picture of animals. Practise directing movement to uncover more of the picture."*  
  *Primary:* `Motor Skills` | *Secondary:* `Sensory Processing`

#### Catch & Pop Games (R36–R41)
*File:* `catch-pop-games.ts`

- [x] **R36 | Key: `balloon-pop`** -> **Title:** `Step & Pop: Balloons`  
  *Description:* *"Step on floating balloons to pop them. Suggested purpose: target-directed stepping and movement control."*  
  *Primary:* `Motor Skills` | *Secondary:* `Balance & Coordination`, `Attention & Focus`
- [x] **R37 | Key: `apple-catch`** -> **Title:** `Basket Apple Catch`  
  *Description:* *"Move a basket to catch falling apples. Suggested purpose: interception timing and coordination; confirm how the basket is controlled."*  
  *Primary:* `Balance & Coordination` | *Secondary:* `Motor Skills`, `Attention & Focus`
- [x] **R38 | Key: `bubble-pop`** -> **Title:** `Step & Pop: Bubbles`  
  *Description:* *"Step on bubbles to pop them. Suggested purpose: directed stepping and movement control."*  
  *Primary:* `Motor Skills` | *Secondary:* `Balance & Coordination`
- [x] **R39 | Key: `candy-pop`** -> **Title:** `Step & Pop: Candy`  
  *Description:* *"Step on candy targets to pop them. Suggested purpose: directed stepping and movement control."*  
  *Primary:* `Motor Skills` | *Secondary:* `Balance & Coordination`
- [x] **R40 | Key: `heart-balloon-pop`** -> **Title:** `Step & Pop: Heart Balloons`  
  *Description:* *"Step on heart-shaped balloons to pop them. Suggested purpose: directed stepping and movement control."*  
  *Primary:* `Motor Skills` | *Secondary:* `Balance & Coordination`
- [x] **R41 | Key: `ball-pop`** -> **Title:** `Step & Pop: Balls`  
  *Description:* *"Step on ball targets to pop them. Suggested purpose: directed stepping and movement control."*  
  *Primary:* `Motor Skills` | *Secondary:* `Balance & Coordination`

#### Selection, Cognitive & Communication Games (R42–R53)
*File:* `selection-games.ts`

- [x] **R42 | Key: `emotion_recognition_ai`** -> **Title:** `Emotion Match`  
  *Description:* *"Listen to an emotion word and step on the matching face. Practise recognising facial expressions and understanding emotion words."*  
  *Primary:* `Emotional Regulation` | *Secondary:* `Communication & Language`, `Cognitive Processing`
- [x] **R43 | Key: `texture_identification`** -> **Title:** `Texture Picture Match`  
  *Description:* *"Listen to a texture word and choose its matching picture. Practise visual texture categories and vocabulary; touching real textures is not confirmed."*  
  *Primary:* `Sensory Processing` | *Secondary:* `Cognitive Processing`, `Communication & Language`
- [x] **R44 | Key: `sound_direction_game`** -> **Title:** `Sound Direction Step`  
  *Description:* *"Listen to where a sound comes from, then step on Left, Both, or Right. Practise matching sound direction to a response."*  
  *Primary:* `Sensory Processing` | *Secondary:* `Attention & Focus`
- [x] **R45 | Key: `yes_or_no_response_game`** -> **Title:** `Yes or No Step`  
  *Description:* *"Read or listen to a question and step on Yes or No. Practise understanding questions and choosing an answer."*  
  *Primary:* `Communication & Language` | *Secondary:* `Cognitive Processing`
- [x] **R46 | Key: `sentence_completion`** -> **Title:** `Complete the Sentence`  
  *Description:* *"Read the unfinished sentence and step on the word that completes it. Practise vocabulary and sentence comprehension."*  
  *Primary:* `Communication & Language` | *Secondary:* `Cognitive Processing`
- [x] **R47 | Key: `ignore-distraction-game`** -> **Title:** `Focus: Colour & Shape`  
  *Description:* *"Find the shape that matches both the colour and shape prompt, while ignoring distracting decorations. Practise selective attention and accurate choices."*  
  *Primary:* `Attention & Focus` | *Secondary:* `Cognitive Processing`, `Motor Skills`
- [x] **R48 | Key: `shape-and-size-logic`** -> **Title:** `Biggest or Smallest`  
  *Description:* *"Step on the biggest or smallest shape, as instructed. Practise comparing sizes and following comparison words."*  
  *Primary:* `Cognitive Processing` | *Secondary:* `Communication & Language`
- [x] **R49 | Key: `odd-one-out-category`** -> **Title:** `Odd One Out: Categories`  
  *Description:* *"Find the item that belongs to a different category. Practise grouping objects by shared features."*  
  *Primary:* `Cognitive Processing` | *Secondary:* `Communication & Language`
- [x] **R50 | Key: `odd-one-out-color`** -> **Title:** `Odd One Out: Colours`  
  *Description:* *"Find the tile with a different colour. Practise noticing visual differences."*  
  *Primary:* `Cognitive Processing` | *Secondary:* `None`
- [x] **R51 | Key: `odd-one-out-shape`** -> **Title:** `Odd One Out: Shapes`  
  *Description:* *"Find the shape that differs from the others. Practise comparing and distinguishing shapes."*  
  *Primary:* `Cognitive Processing` | *Secondary:* `None`
- [x] **R52 | Key: `smart-object-recognition`** -> **Title:** `Find the Named Object`  
  *Description:* *"Find and step on the object named in the prompt. Practise recognising everyday objects and linking names to pictures."*  
  *Primary:* `Cognitive Processing` | *Secondary:* `Communication & Language`
- [x] **R53 | Key: `color-reaction-step`** -> **Title:** `Colour Cue Step`  
  *Description:* *"Step on the colour named in the prompt. Practise responding to cues with controlled, directed steps."*  
  *Primary:* `Motor Skills` | *Secondary:* `Attention & Focus`, `Balance & Coordination`

---

## 3. Telemetry & Results Ingestion Engine

### 3.1 Fixing the Session Dash (`—`) for Trail Games
*Problem:* In the child profile sessions tab ([`summarize-family-stats.ts`](file:///c:/workspace/galamine/haber/apps/web/src/features/session/summarize-family-stats.ts)), trail games have no metric parser in [`packages/api/src/lib/game-result-summary.ts`](file:///c:/workspace/galamine/haber/packages/api/src/lib/game-result-summary.ts). They fall back to `family: "UNKNOWN"` and display `"—"`.

- [ ] **Add Trail Metric Schema in `game-result-summary.ts`:**
  ```ts
  const TrailRawMetrics = z.object({
    gameName: z.string(),
    activeMovementSec: z.number().optional(),
    trackingPauseSec: z.number().optional(),
    areaExploredPct: z.number().optional(),
    assistanceLevel: z.string().optional(),
  });
  ```
- [ ] **Add Summary Parser for TRAIL:**
  Return active time and area percentage explored (e.g., `"180s active, 65% area"`).
- [ ] **Create `TrailResultView.tsx` Component:**
  Render a card displaying participation time, pause duration, and floor coverage in [`GameResultCard.tsx`](file:///c:/workspace/galamine/haber/apps/web/src/features/session/game-result/GameResultCard.tsx).

---

### 3.2 Fixing the `Level N/A` Badge
*Problem:* In [`apps/web/src/components/game-library/GameCard.tsx`](file:///c:/workspace/galamine/haber/apps/web/src/components/game-library/GameCard.tsx#L29), the badge evaluates `game.difficulty || "N/A"`. Because `difficulty` is null in the database, all games display `Level N/A`, even though their versions specify supported levels (1–10).

- [ ] Update `GameCard.tsx` to read `game.versions[0]?.supportedLevels`:
  - If `supportedLevels.length > 1`: Display `Levels ${min}-${max}` (e.g., `Levels 1–10`).
  - If `supportedLevels.length === 1`: Display `Level ${supportedLevels[0]}`.
  - Fall back to `"Level 1"` instead of `"Level N/A"`.

---

### 3.3 Multi-Game Session Result Architecture
*Problem:* [`packages/db/prisma/schema/sessions.prisma`](file:///c:/workspace/galamine/haber/packages/db/prisma/schema/sessions.prisma#L63) enforces `sessionId String @unique` on `GameResult`. If a session includes 2 or 3 games, results for subsequent games cannot be stored independently.

- [ ] Remove `@unique` on `GameResult.sessionId`.
- [ ] Enforce 1:1 attribution through `sessionAssignmentId String @unique` instead, so each assigned game in a multi-game session records its own distinct metrics.

---

## 4. Execution Checklist & Verification Gates

### Step 1: Database & Seed Updates
1. [x] Titles, descriptions and domains applied through `packages/db/prisma/game-registry/catalog-overlay.ts` (registry files left untouched).
2. [x] Update `seed-games.ts` to seed the 10 Clinical Domains and assign them as `categoryId`.
3. [x] Run `pnpm db:push` and re-seed the catalog (local database reset 13 Nov 2026).

### Step 2: Hono Server & tRPC API
1. [ ] Add `goalPreset` router in `packages/api/src/routers/`.
2. [ ] Support clinic-specific custom categories in `game.ts`.
3. [ ] Add `TRAIL` metric parser to `game-result-summary.ts`.

### Step 3: Web Client (TanStack Router)
1. [ ] Fix Child Intake form fields (`children/new.tsx`).
2. [ ] Update Treatment Plan form: change weeks to months, remove global session duration (`plans/new.tsx`).
3. [ ] Update Game Card badge to resolve `Level N/A` (`GameCard.tsx`).
4. [ ] Enable editing selected games in session creation (`CreateSessionSheet.tsx`).
5. [ ] Simplify the time selector (`time-picker.tsx`).
6. [ ] Add game preview modal button (`GameDetailSheet.tsx`).

### Step 4: Verification Commands
```bash
# Verify TypeScript typing across all packages
pnpm check-types

# Verify code style and formatting via Biome
pnpm check

# Start development servers
pnpm dev
```
