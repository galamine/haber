# FE-07: Session Scheduling & Game Execution UI

## Context

Therapists need a daily session workflow: see today's sessions grouped by status, open a session to assign rooms and launch games, track game completion via webhook polling, mark children absent, or manually close sessions. FE-05 (PlanDetailPage) is done. BE-12 provides the tRPC procedures and webhook endpoints.

**BE-12 is the hard dependency.**

## Files to Create

```
apps/web/src/routes/_authenticated/sessions/
├── index.tsx                → /dashboard/sessions       (TodaySessionsPage)
├── uncovered.tsx            → /dashboard/sessions/uncovered  (UncoveredSessionsPage)
└── $sessionId.tsx           → /dashboard/sessions/:sessionId  (SessionDetailPage)
```

## Files to Modify

```
apps/web/src/routes/_authenticated/dashboard.tsx     — add "Sessions" nav link
```

---

## Implementation Details

### TodaySessionsPage (`sessions/index.tsx`)

- Header: "Today's Sessions" + current date
- Fetch `session.listForToday` with `refetchInterval: 30_000`
- Sessions grouped by status (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `ABSENT`) using a tab per status
- Per session card: child name, scheduled time, room (or "Unassigned"), game count, status badge
- Each card links to `/dashboard/sessions/:sessionId`

### SessionDetailPage (`sessions/$sessionId.tsx`)

- Status banner with badge + started time
- Child summary: name, plan name, consent status
- Room assignment dropdown: fetch `clinic.listSensoryRooms`, on select call `session.assignRoom`
- Game cards: show game name, version, instructions, duration
- "Open Game" button: fetch `session.getWebhookUrl`, construct URL `https://game-server.example.com/?game_id=...&version=...&session_id=...&webhook_secret=...`, `window.open` in new tab
- After opening: poll `session.get` every 5 seconds (`refetchInterval: 5_000`) while `status = IN_PROGRESS`
- When `status = COMPLETED`: show `GameResult` (score, rubric version)
- "Mark Absent" button: only shown for `PENDING`; calls `session.markAbsent`
- "Close Session" button: opens Sheet with `notes` textarea + `qualityTag` radio (CALM / DISTRACTED / REFUSED); calls `session.manualClose`

### UncoveredSessionsPage (`sessions/uncovered.tsx`)

- Fetch `session.listUncovered`
- Per session card with "Claim" button
- On claim success: navigate to `/dashboard/sessions`

### Navigation

In `dashboard.tsx`, add a nav item: `/dashboard/sessions` → "Sessions" with a `event` icon.

---

## tRPC Hooks Used

| Hook | Polling | Purpose |
|------|---------|---------|
| `trpc.session.listForToday.useQuery()` | 30s | Today's session list |
| `trpc.session.get.useQuery()` | 5s (when IN_PROGRESS) | Session detail + status polling |
| `trpc.session.getWebhookUrl.useQuery()` | — | Get game launch URL params |
| `trpc.session.assignRoom.useMutation()` | — | Assign room |
| `trpc.session.markAbsent.useMutation()` | — | Mark absent |
| `trpc.session.manualClose.useMutation()` | — | Close session with notes |
| `trpc.session.claimCoverage.useMutation()` | — | Claim uncovered session |
| `trpc.session.listUncovered.useQuery()` | — | Uncovered session list |
| `trpc.clinic.listSensoryRooms.useQuery()` | — | Room dropdown |

---

## Out of Scope

- Game result visualization beyond score display — deferred
- Printing/exporting session records — deferred to FE-11

---

## Verification

1. `pnpm check-types` — must pass across all packages
2. `pnpm check` (Biome) — on new and edited files
3. `/dashboard/sessions` shows only the calling therapist's sessions with today's date
4. Room dropdown shows active rooms; selecting one persists
5. "Open Game" opens correct URL with all 4 params in a new tab
6. After game completion webhook fires, page updates to show result without refresh
7. "Mark Absent" hidden for non-PENDING sessions
8. "Close Session" sheet submits correctly with notes and quality tag
9. Claiming an uncovered session moves it to today's list
