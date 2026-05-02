# 04-otp-auth-refresh-token-rotation

## What to build

Complete authentication overhaul: email+OTP sign-in (6-digit, 10-min validity, max 5 attempts, rate-limited), refresh token rotation with reuse detection, 24-hour idle session expiry, "log out everywhere" functionality. Replaces existing password-based auth with OTP-only flow.

## Acceptance criteria

- [ ] `POST /v1/auth/login` — accepts email+password, returns OTP (rate-limited per email+IP, max 5 attempts/10min)
- [ ] `POST /v1/auth/verify-otp` — verifies 6-digit OTP, returns access + refresh tokens
- [ ] `POST /v1/auth/refresh` — rotates refresh token, invalidates old one (reuse detection)
- [ ] `POST /v1/auth/logout` — invalidates current refresh token
- [ ] `POST /v1/auth/logout-everywhere` — invalidates ALL refresh tokens for user
- [ ] JWT access token: 24h expiry, contains user_id, tenant_id, role, permissions
- [ ] Refresh token: 7-day expiry, stored in DB with family_id for rotation detection
- [ ] Refresh token reuse detection: if reused token presented, invalidate entire family (security breach)
- [ ] Rate limiting: per email+phone AND per IP (500 req/min per IP)
- [ ] AuthService updated to handle OTP generation/delivery (email)
- [ ] Frontend: Login page with email input, OTP entry, "remember this device" option
- [ ] Integration tests: OTP rate limit, token rotation, reuse detection, logout everywhere

## Blocked by

- [03-staff-management-invite-permissions.md](./03-staff-management-invite-permissions.md)

## User stories

- #3: As a Doctor, Therapist, or Staff, sign in with email + OTP (6-digit, 10-min validity, max 5 attempts, rate-limited)
- #4: Session expires after 24h idle, supports refresh token rotation with reuse detection
- #5: "Log out everywhere" invalidates all refresh tokens