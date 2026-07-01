# FE-07: Session Scheduling & Game Execution UI

## What to build

Build the therapist's daily session workflow: today's session list, session detail with game launch, room assignment, absent marking, manual close, and coverage claim for uncovered sessions.

**Package:** `apps/web`

### Routes to add

Add these files under `apps/web/src/routes/_authenticated/`:

```
_authenticated/
└── sessions/
    ├── index.tsx                    → /dashboard/sessions
    ├── uncovered.tsx                → /dashboard/sessions/uncovered
    └── $sessionId.tsx               → /dashboard/sessions/:sessionId
```

TanStack Router matches static segments before dynamic ones, so `/sessions/uncovered` correctly hits `uncovered.tsx` rather than `$sessionId.tsx`.

### Key components

**TodaySessionsPage:**
- Header: today's date + session count
- List of sessions grouped by status (Pending, In Progress, Completed, Absent)
- Per session card: child name + age, scheduled time, room assigned (or "Unassigned"), game count, status badge
- "Claim" button on uncovered sessions → calls `session.claimCoverage`
- Link to `SessionDetailPage`

**SessionDetailPage:**
- Child summary banner (name, active plan name, consent status)
- Room assignment: dropdown from `clinic.listSensoryRooms`; saves via `session.assignRoom`
- Game assignments list: per game card showing game name, version, duration, reps, instructions
- "Open Game" button per game:
  - Fetches `session.getWebhookUrl` to get `{ game_id, version, session_id, webhook_secret }`
  - Opens the game URL in a new browser tab (URL constructed client-side)
  - After clicking, polls `session.get` every 5 seconds to detect when `status = COMPLETED` (webhook fired)
- Result display: once session status = COMPLETED, show the `GameResult` (score, rubric version, key metrics)
- Actions panel:
  - "Mark Absent" button (only for PENDING sessions) — calls `session.markAbsent`
  - "Close Session" button — opens a sheet with notes textarea + quality tag radio (Calm / Distracted / Refused) — calls `session.manualClose`
- Status banner updates automatically (polling or React Query refetch interval)

**UncoveredSessionsPage:**
- Sessions from `session.listUncovered` — sessions where the originally assigned therapist is absent
- "Claim" button per session
- After claiming, session appears in `TodaySessionsPage`

### Game launch mechanism

The "Open Game" flow (no iframe — new tab):
```typescript
const { data } = api.session.getWebhookUrl.useQuery({ sessionId, gameId, gameVersion })
// Constructs: https://game-server.example.com/?game_id=...&version=...&session_id=...&webhook_secret=...
window.open(gameUrl, '_blank')
```

### tRPC hooks used

- `api.session.listForToday.useQuery({ refetchInterval: 30_000 })`
- `api.session.get.useQuery({ refetchInterval: 5_000 })` (on SessionDetailPage while IN_PROGRESS)
- `api.session.getWebhookUrl.useQuery()`
- `api.session.assignRoom.useMutation()`
- `api.session.markAbsent.useMutation()`
- `api.session.manualClose.useMutation()`
- `api.session.claimCoverage.useMutation()`
- `api.session.listUncovered.useQuery()`
- `api.clinic.listSensoryRooms.useQuery()`

## Acceptance criteria

- [ ] `TodaySessionsPage` shows only today's sessions for the logged-in therapist
- [ ] Room assignment dropdown shows active rooms; selecting a room persists via API
- [ ] "Open Game" button constructs the correct URL with all 4 parameters and opens in a new tab
- [ ] SessionDetailPage polls every 5s; when the game calls the complete webhook, the page updates to show the result without a manual refresh
- [ ] "Mark Absent" is disabled for non-PENDING sessions
- [ ] "Close Session" sheet captures notes and quality tag; submits via `session.manualClose`
- [ ] Uncovered sessions page shows claimable sessions; clicking "Claim" moves them to today's list
- [ ] `pnpm check-types` passes

## Blocked by

- BE-12 (Session execution and webhook API)
- FE-05 (Sessions are generated from plans; plan UI must exist to create sessions)
