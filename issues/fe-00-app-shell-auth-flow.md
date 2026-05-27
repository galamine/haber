# FE-00: App Shell, Sidebar Navigation & OTP Auth Flow

## What to build

Build the authenticated application shell (sidebar layout with role-based navigation), complete the OTP-based login flow (replace the current email+password form), and implement token refresh with idle-session detection.

**Package:** `packages/client`

### Pages & routes

Update `packages/client/src/router.tsx`:
```
/ → redirect to /login or /dashboard
/login → LoginPage (OTP flow)
/dashboard → DashboardLayout (shell with sidebar)
  /dashboard/... → nested authenticated routes (populated by later FE issues)
```

### LoginPage overhaul (`packages/client/src/pages/login.tsx`)

Replace the current email+password form with the OTP flow:

1. **Step 1 — Email entry:** email input + "Send OTP" button → calls `api.auth.requestOtp`; shows success message
2. **Step 2 — Code entry:** 6-digit OTP input (use the existing `InputOtp` component from `packages/client/src/components/ui/input-otp.tsx`) + "Verify" button → calls `api.auth.verifyOtp`; on success stores tokens and redirects to `/dashboard`
3. Error states: wrong code (with attempt counter display), OTP expired, rate-limited message

### App shell (`packages/client/src/components/shell/`)

Create `AppShell.tsx` — the authenticated layout used by all `/dashboard` routes:
- Uses the existing `Sidebar` component from `packages/client/src/components/ui/sidebar.tsx`
- Role-based nav items (hidden if role doesn't match):
  - All roles: Dashboard, Children (coming soon), Sessions Today
  - Therapist+: Assessments, Treatment Plans
  - ClinicAdmin+: Staff, Clinic Settings, Reports
  - SuperAdmin: Platform Overview
- Uses `HaberLogo` in the sidebar header (already built)
- User menu in sidebar footer: name, role badge, "Log out" button, "Log out everywhere" link

### Auth store updates (`packages/client/src/stores/auth.ts`)

- Add `role: UserRole | null` and `tenantId: string | null` to persisted state
- Parse from JWT on `setTokens()`
- Add `isIdle(): boolean` check (compares last activity timestamp to 24h threshold)
- Auto-call `auth.refreshToken` before access token expiry (15-min window)

### Route protection

Add `RequireAuth` wrapper component: redirects to `/login` if no valid access token. Add `RequireRole` wrapper: redirects to `/dashboard` if role is insufficient.

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
- [ ] `pnpm --filter client typecheck` passes
- [ ] No console errors in browser

## Blocked by

- BE-00 (OTP auth API must return JWT with role/tenantId claims)
