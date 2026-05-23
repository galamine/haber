# BE-00: Passwordless Auth Hardening & Multi-Tenant JWT

## What to build

Complete the authentication layer to match the PRD spec. The current schema has a `password` field and basic OTP flow but is missing multi-tenant JWT claims, rate limiting, reuse detection, and several security controls.

**Packages:** `packages/api`, `packages/shared`

### Changes required

**Prisma schema (`packages/api/prisma/schema.prisma`):**
- Remove `password` field from `User`
- Add `loginEnabled Boolean @default(true)` to `User`
- Add `clinicId String?` FK on `User` (null = SuperAdmin, populated for all others)
- Add `role` enum: `SUPER_ADMIN | CLINIC_ADMIN | THERAPIST | STAFF`
- Add `attemptCount Int @default(0)` and `invalidatedAt DateTime?` to `Otp`
- Add `lastActivity DateTime @default(now())` to `Session` (for 24h idle expiry)
- Add `reuseDetected Boolean @default(false)` to `Session`

**Auth service (`packages/api/src/router/auth.ts`):**
- `auth.requestOtp` — rate-limit: 3 requests per email per 10 min (in-memory or Redis-backed middleware); return generic success even if email not found
- `auth.verifyOtp` — increment `attemptCount` on wrong code; invalidate OTP after 5 failed attempts; set `User.emailVerified = true` on first success
- `auth.verifyOtp` → JWT access token (15 min expiry) with claims: `{ sub: userId, role, tenantId: clinicId | null }`
- `auth.refreshToken` — rotate refresh token on use; set `reuseDetected = true` and revoke entire family on reuse
- `auth.logout` — revoke single refresh token
- `auth.logoutAll` — revoke all refresh tokens for the user
- 24h idle session detection: update `lastActivity` on each protected procedure call; `refreshToken` rejects if `lastActivity` is >24h ago

**Shared schemas (`packages/shared/src/schemas/index.ts`):**
- Export `UserRole` enum
- Export `JwtPayload` type: `{ sub, role, tenantId }`
- Export `RequestOtpInput`, `VerifyOtpInput` Zod schemas

**tRPC context (`packages/api/src/context.ts`):**
- Parse JWT on every request; attach `{ user, role, tenantId }` to context
- Export `protectedProcedure` and `adminProcedure` helpers that check role

**Super Admin bootstrap:**
- CLI seed script (`packages/api/prisma/seed-super-admin.ts`) that inserts a SuperAdmin user directly with `loginEnabled = true`, `clinicId = null`, `role = SUPER_ADMIN`

## Acceptance criteria

- [ ] `auth.requestOtp` returns success for unknown emails (no enumeration leak)
- [ ] OTP is invalidated after 5 wrong `verifyOtp` attempts; further attempts return `UNAUTHORIZED`
- [ ] Max 3 OTP requests per email per 10 min; 4th returns `TOO_MANY_REQUESTS`
- [ ] JWT access token contains `{ sub, role, tenantId }` claims
- [ ] SuperAdmin JWT has `tenantId: null`; all other users have their `clinicId`
- [ ] `auth.refreshToken` rotates the token and invalidates the old one
- [ ] Reusing an invalidated refresh token sets `reuseDetected` and revokes the entire session family
- [ ] `auth.logoutAll` invalidates all refresh tokens for the user
- [ ] `User.emailVerified` is set to `true` on the first successful OTP verification
- [ ] Protected procedures return `UNAUTHORIZED` if session `lastActivity` > 24h ago
- [ ] Seed script creates SuperAdmin with `loginEnabled = true`, no `clinicId`
- [ ] TypeScript strict mode passes; Biome lint passes

## Blocked by

None — can start immediately
