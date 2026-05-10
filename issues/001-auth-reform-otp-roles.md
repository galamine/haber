# 001 — Auth Reform: OTP + Role Expansion [HITL]

**Type:** HITL — requires design review before coding starts (replaces existing working auth system)  
**PRD User Stories:** 2, 3, 4, 5

## What to build

Replace the existing email+password auth system with an email+OTP flow (no passwords). Expand the role system from `user/admin` to five roles: `super_admin`, `clinic_admin`, `doctor`, `therapist`, `staff`. Every subsequent feature depends on this role system and the expanded JWT claims.

The OTP flow: user enters email → server generates 6-digit OTP, sends via email, stores hashed OTP with 10-minute expiry and 5-attempt rate limit → user enters OTP → server issues access token (24h idle expiry) + refresh token (rotation with reuse detection). Session "log out everywhere" invalidates all refresh tokens for the user.

**Design decision required before coding:** How to migrate existing `user/admin` records to the new role enum without breaking the test suite or existing dev data. The `password` field must be dropped cleanly.

## Acceptance criteria

**Schema / migrations**
- [ ] Remove `password` field from `User` model
- [ ] Add `role` enum values: `super_admin`, `clinic_admin`, `doctor`, `therapist`, `staff` (replacing `user` and `admin`)
- [ ] Add `OtpRecord` model: `id`, `userId` (FK), `hashedOtp`, `expiresAt`, `attempts` (int default 0), `type` (`login` | `invite`), `usedAt` (nullable), `createdAt`
- [ ] Add `tenant_id` (nullable UUID FK to `Clinic`) on `User` — nullable until Clinic model is added in issue 002
- [ ] Token model gains `deviceId` (nullable) for "log out everywhere" targeting

**API endpoints**
- [ ] `POST /auth/request-otp` — accepts `{ email }`, generates 6-digit OTP, sends email, returns `{ message: 'OTP sent' }` (rate-limited: max 5 OTP requests per email per hour)
- [ ] `POST /auth/verify-otp` — accepts `{ email, otp }`, validates OTP (hashed, not expired, attempts < 5), issues `{ accessToken, refreshToken }`; increments attempt count on failure; burns OTP on success
- [ ] `POST /auth/refresh-tokens` — rotates refresh token; detects reuse (returns 401 and blacklists family)
- [ ] `POST /auth/logout` — invalidates specific refresh token
- [ ] `POST /auth/logout-all` — invalidates all refresh tokens for the caller
- [ ] Remove `POST /auth/register`, `POST /auth/login`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/verify-email` (these flows no longer exist)
- [ ] JWT payload gains `role` and `tenant_id` claims
- [ ] Role-rights map in `@haber/shared` updated with the 5 new roles and their base rights

**Frontend**
- [ ] Replace `LoginPage.tsx` with a two-step OTP flow: step 1 email input, step 2 OTP input (6-digit, auto-submit on last digit)
- [ ] Remove `RegisterPage.tsx` (users are now invited, not self-registered)
- [ ] Auth store updated to hold `role` and `tenant_id` alongside `accessToken`/`refreshToken`
- [ ] `ProtectedRoute.tsx` accepts an optional `requiredRoles` prop and renders 403 if role doesn't match
- [ ] "Log out everywhere" button in account settings / header menu

**Tests**
- [ ] OTP generation produces a 6-digit string
- [ ] OTP email is sent to the correct address
- [ ] Verify-OTP returns 401 after 5 failed attempts
- [ ] Verify-OTP returns 401 after OTP expiry (10 min)
- [ ] Verify-OTP burns the OTP on success (reuse returns 401)
- [ ] Refresh token reuse detection: second use of a rotated token returns 401 and blacklists the token family
- [ ] `POST /auth/logout-all` invalidates all refresh tokens; subsequent refresh returns 401
- [ ] JWT payload contains `role` and `tenant_id` claims
- [ ] `ProtectedRoute` renders 403 page for insufficient role

## QA / Manual testing

- [ ] Open the app — you are redirected to the new OTP login page (no password field visible)
- [ ] Enter a valid email, click Send OTP — check email inbox for a 6-digit code
- [ ] Enter the wrong OTP 5 times — verify you are locked out (401, "too many attempts" message)
- [ ] Request a new OTP, enter it correctly — verify you land on the dashboard and the JWT in localStorage contains `role` and `tenant_id`
- [ ] Open the app in a second tab, log out everywhere from the first tab — verify the second tab's next API call returns 401 and redirects to login
- [ ] Attempt to access `/users` as a `therapist` role — verify a 403 page is shown

## Blocked by

None — can start immediately
