# FE-00: App Shell, Sidebar Navigation & OTP Auth Flow

## What to build

Build the authenticated application shell (sidebar layout with role-based navigation), complete the OTP-based login flow (replace the current email+password form), and implement token refresh with idle-session detection.

**Package:** `apps/web`

### Pages & routes

Add the following files to `apps/web/src/routes/` (TanStack Router auto-discovers them and regenerates `routeTree.gen.ts` — never edit that file manually):

```
apps/web/src/routes/
├── index.tsx                      → / (redirect to /dashboard or /login)
├── login.tsx                      → /login (OTP flow)
├── _authenticated.tsx             → authenticated layout (sidebar shell + beforeLoad guard)
└── _authenticated/
    └── dashboard.tsx              → /dashboard (populated by later FE issues)
```

### LoginPage overhaul (`apps/web/src/routes/login.tsx`)

Replace the current email+password form with the OTP flow:

1. **Step 1 — Email entry:** email input + "Send OTP" button → calls `api.auth.requestOtp`; shows success message
2. **Step 2 — Code entry:** 6-digit OTP input (use the existing `InputOtp` component from `@habe-final/ui/components/input-otp.tsx`) + "Verify" button → calls `api.auth.verifyOtp`; on success stores tokens and redirects to `/dashboard`
3. Error states: wrong code (with attempt counter display), OTP expired, rate-limited message

### App shell (`apps/web/src/components/shell/`)

Create `AppShell.tsx` — the authenticated layout used by all `/dashboard` routes:
- Uses the existing `Sidebar` component from `@habe-final/ui/components/sidebar.tsx`
- Role-based nav items (hidden if role doesn't match):
  - All roles: Dashboard, Children (coming soon), Sessions Today
  - Therapist+: Assessments, Treatment Plans
  - ClinicAdmin+: Staff, Clinic Settings, Reports
  - SuperAdmin: Platform Overview
- Uses `HaberLogo` in the sidebar header (already built)
- User menu in sidebar footer: name, role badge, "Log out" button, "Log out everywhere" link

### Auth store updates (`apps/web/src/stores/auth.ts`)

- Add `role: UserRole | null` and `tenantId: string | null` to persisted state
- Parse from JWT on `setTokens()`
- Add `isIdle(): boolean` check (compares last activity timestamp to 24h threshold)
- Auto-call `auth.refreshToken` before access token expiry (15-min window)

### Route protection

In TanStack Router, route guards live in `beforeLoad` — no wrapper components needed:

```ts
// apps/web/src/routes/_authenticated.tsx
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  component: AppShell,
})
```

Role-gated sub-routes (`staff`, `settings`, etc.) add their own `beforeLoad` that checks `context.auth.role` and `throw redirect({ to: '/_authenticated/dashboard' })` if insufficient.

The router must receive the auth store as context — wire it in `apps/web/src/main.tsx`:
```ts
const router = createRouter({ routeTree, context: { auth: useAuthStore.getState() } })
```

Add `zustand` to `apps/web`: `pnpm --filter web add zustand`.

### tRPC hooks used

- `api.auth.requestOtp.useMutation()`
- `api.auth.verifyOtp.useMutation()`
- `api.auth.logout.useMutation()`
- `api.auth.logoutAll.useMutation()`

## Acceptance criteria

- [ ] Login page shows email → OTP two-step flow with the `InputOtp` component
- [ ] Wrong OTP code shows error; 5th wrong attempt shows "OTP invalidated, request a new one"
- [ ] Rate-limit hit shows "Too many requests, try again in 10 minutes"
- [ ] Successful login stores tokens and navigates to `/dashboard`
- [ ] Sidebar nav items are filtered by user role
- [ ] "Log out" clears tokens and redirects to `/login`
- [ ] Refreshing the page while authenticated does not log the user out (Zustand persist)
- [ ] `pnpm check-types` passes
- [ ] No console errors in browser

## Blocked by

- BE-00 (OTP auth API must return JWT with role/tenantId claims)
