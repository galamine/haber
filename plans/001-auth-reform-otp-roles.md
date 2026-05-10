# Plan: Issue 001 — Auth Reform: OTP + Role Expansion

## Context

HaberApp currently uses email+password auth with two roles (`user`, `admin`). This replaces the entire auth system with an OTP-based flow and expands to four clinical roles. Every subsequent feature depends on the JWT claims (`role`, `tenant_id`) and the new role enum established here. This is a complete replacement — all password-related routes, services, and tests are deleted.

## Design Decisions

| Decision | Choice |
|---|---|
| Merged doctor+therapist role name | `therapist` |
| Four roles | `super_admin`, `clinic_admin`, `therapist`, `staff` |
| Migration: old `user` records | → `staff` |
| Migration: old `admin` records | → `super_admin` |
| Refresh token reuse detection | `familyId` UUID on Token; cascading blacklist on reuse |
| OTP hashing | bcrypt (existing dependency) |
| OTP rate limiting | DB-based: count OtpRecords for email in last hour in service layer |
| `tenant_id` in JWT | Included as `null` now; stable shape for issue 002 |
| Unknown email on OTP request | Silent success (anti-enumeration) |
| Frontend OTP input | `input-otp` library |
| `deviceId` on Token | Column scaffolded, no logic built |
| Base role rights | `super_admin/clinic_admin`: `[getUsers, manageUsers]`; `therapist/staff`: `[getUsers]` |
| ProtectedRoute 403 | Inline `<Forbidden />` component (no redirect) |
| OTP `type: invite` | Enum scaffolded on OtpRecord, only `login` flow implemented |
| OTP email format | Simple HTML template (branded, large code display) |

---

## Step 0: Update Issue File

- Edit `issues/001-auth-reform-otp-roles.md`: remove all references to `doctor` role; roles become `super_admin`, `clinic_admin`, `therapist`, `staff`

---

## Step 1: Shared Package (`packages/shared/src/`)

### `constants/roles.ts`
- Replace `USER_ROLES = ['user', 'admin']` with `USER_ROLES = ['super_admin', 'clinic_admin', 'therapist', 'staff']`
- Update `allRoles` map:
  ```ts
  super_admin:  ['getUsers', 'manageUsers'],
  clinic_admin: ['getUsers', 'manageUsers'],
  therapist:    ['getUsers'],
  staff:        ['getUsers'],
  ```
- Remove `TokenType` enum (move to backend `config/tokens.ts`)

### `schemas/auth.schema.ts`
- Remove: `RegisterDtoSchema`, `LoginDtoSchema`, `ForgotPasswordDtoSchema`, `ResetPasswordDtoSchema`
- Add:
  - `RequestOtpDtoSchema` — `{ email: z.string().email() }`
  - `VerifyOtpDtoSchema` — `{ email: z.string().email(), otp: z.string().length(6) }`
  - Keep: `RefreshTokensDtoSchema`, `LogoutDtoSchema`

### `schemas/user.schema.ts`
- `UserDtoSchema`: remove `password`; add `role` (z.enum of 4 roles); add `tenantId` (z.string().uuid().nullable())
- `CreateUserDtoSchema`: remove `password`; `role` required

### `dtos/auth.dto.ts`
- Update inferred types from new schemas

**After changes:** `pnpm build:shared`

---

## Step 2: Prisma Schema + Migration (`apps/backend/prisma/`)

### `schema.prisma` changes

**User model** — remove `password`, `isEmailVerified`; add `role` enum, `tenantId`:
```prisma
model User {
  id         String      @id @default(uuid())
  name       String
  email      String      @unique
  role       Role        @default(staff)
  tenantId   String?     @map("tenant_id")
  createdAt  DateTime    @default(now()) @map("created_at")
  updatedAt  DateTime    @updatedAt @map("updated_at")
  tokens     Token[]
  otpRecords OtpRecord[]
  @@map("users")
}

enum Role {
  super_admin
  clinic_admin
  therapist
  staff
}
```

**Token model** — add `familyId`, `deviceId`; change type to enum:
```prisma
model Token {
  id          String    @id @default(uuid())
  token       String    @db.Text
  userId      String    @map("user_id")
  type        TokenType
  expires     DateTime
  blacklisted Boolean   @default(false)
  familyId    String?   @map("family_id")
  deviceId    String?   @map("device_id")
  createdAt   DateTime  @default(now()) @map("created_at")
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, type])
  @@map("tokens")
}

enum TokenType {
  access
  refresh
}
```

**New OtpRecord model:**
```prisma
model OtpRecord {
  id         String    @id @default(uuid())
  userId     String    @map("user_id")
  hashedOtp  String    @map("hashed_otp")
  expiresAt  DateTime  @map("expires_at")
  attempts   Int       @default(0)
  type       OtpType
  usedAt     DateTime? @map("used_at")
  createdAt  DateTime  @default(now()) @map("created_at")
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@map("otp_records")
}

enum OtpType {
  login
  invite
}
```

### Migration SQL
Add manually after `prisma migrate dev --create-only`:
```sql
UPDATE users SET role = 'staff' WHERE role = 'user';
UPDATE users SET role = 'super_admin' WHERE role = 'admin';
```

---

## Step 3: Backend Config (`apps/backend/src/config/`)

### `tokens.ts`
- TokenType enum: only `access` | `refresh` (remove RESET_PASSWORD, VERIFY_EMAIL)
- JWT payload type:
  ```ts
  interface TokenPayload {
    sub: string;
    role: UserRole;
    tenantId: string | null;
    type: 'access' | 'refresh';
    iat: number;
    exp: number;
  }
  ```

### `passport.ts`
- Remove `password` from user lookup

---

## Step 4: New OTP Service (`apps/backend/src/services/otp.service.ts`)

- `generateOtp()` — `crypto.randomInt(100000, 999999).toString()`
- `requestOtp(email)`:
  1. Find user by email — if not found, return silently
  2. Count OtpRecords for userId in last hour — if ≥ 5, throw `ApiError(429)`
  3. bcrypt-hash OTP, create OtpRecord (`type: login`, `expiresAt: now + 10min`)
  4. Call `emailService.sendOtpEmail(email, otp)`
- `verifyOtp(email, otp)`:
  1. Find user — if not found, throw `ApiError(401, 'Invalid OTP')`
  2. Find latest unused OtpRecord for userId with `type: login`
  3. Check expiry → `ApiError(401, 'OTP expired')`
  4. Check attempts ≥ 5 → `ApiError(401, 'Too many attempts')`
  5. `bcrypt.compare` — fail: increment attempts, throw 401; success: set `usedAt = now`, return user

---

## Step 5: Update Token Service (`apps/backend/src/services/token.service.ts`)

- `generateToken(userId, role, tenantId, expires, type, familyId?)` — add role, tenantId to JWT payload
- `generateAuthTokens(user)` — generate new `familyId = uuid()` per login; refresh token saved with familyId
- `refreshAuth(refreshToken)`:
  - If token blacklisted: blacklist all with same `familyId`, throw `ApiError(401, 'Refresh token reuse detected')`
  - Else: delete old token, issue new pair inheriting same `familyId`
- Remove: `generateResetPasswordToken`, `generateVerifyEmailToken`

---

## Step 6: Email Service (`apps/backend/src/services/email.service.ts`)

- `sendOtpEmail(to, otp)` — nodemailer via `SMTP_*` env vars
- HTML template: Haber branding, large OTP code display, 10-minute expiry notice, plain-text fallback

---

## Step 7: Auth Service (`apps/backend/src/services/auth.service.ts`)

Complete rewrite:
- Remove: `loginUserWithEmailAndPassword`, `resetPassword`
- `logout(refreshToken)` — blacklist specific token
- `logoutAll(userId)` — blacklist all refresh tokens for user
- `refreshAuth` — moved to token service

---

## Step 8: Controllers + Routes + Validations

### Routes (`routes/v1/auth.route.ts`)
```
POST /auth/request-otp     (public)
POST /auth/verify-otp      (public)
POST /auth/refresh-tokens  (public)
POST /auth/logout          (auth required)
POST /auth/logout-all      (auth required)
```
Remove all old password-based routes.

### Controller (`controllers/auth.controller.ts`)
- Remove: register, login, forgotPassword, resetPassword, sendVerificationEmail, verifyEmail
- Add: requestOtp, verifyOtp, logoutAll

### Validations (`validations/auth.validation.ts`)
- Replace all with `RequestOtpDtoSchema`, `VerifyOtpDtoSchema` from shared

---

## Step 9: Auth Middleware (`middlewares/auth.ts`)

- Read `role` and `tenantId` from JWT payload
- Attach `{ id, role, tenantId }` to `req.user`
- Remove `isEmailVerified` references

---

## Step 10: Frontend

### Dependencies
```bash
cd apps/frontend && pnpm add input-otp
```

### `store/authStore.ts`
- Add `role: UserRole | null`, `tenantId: string | null` to state + setAuth/clearAuth

### `pages/LoginPage.tsx` (rewrite)
- Step 1: email input → `POST /auth/request-otp`
- Step 2: `<OTPInput>` (6 slots, auto-submit on last digit) → `POST /auth/verify-otp`
- On success: store role + tenantId, navigate to dashboard

### `pages/RegisterPage.tsx`
- Delete; remove from router

### `components/ProtectedRoute.tsx`
- Add `requiredRoles?: UserRole[]` prop
- Render inline `<Forbidden />` if role not in requiredRoles

### `api/auth.ts`
- Remove: register, login, forgotPassword, resetPassword, verifyEmail
- Add: `requestOtp(email)`, `verifyOtp(email, otp)`, `logoutAll()`

### Header / account settings
- Add "Log out everywhere" button → `logoutAll()` → clear store → navigate to login

---

## Step 11: Tests (`apps/backend/tests/integration/auth.test.ts`)

Complete rewrite. Add `otp_records` to `setupTestDB.ts` cleanup.

Required test cases:
1. OTP generation produces a 6-digit string
2. OTP email sent to correct address (mock emailService)
3. `verify-otp` returns 401 after 5 failed attempts
4. `verify-otp` returns 401 after OTP expiry
5. `verify-otp` burns OTP on success (reuse → 401)
6. Refresh token reuse detection → 401 + blacklists family
7. `logout-all` → all refresh tokens invalid
8. JWT payload contains `role` and `tenantId`
9. `ProtectedRoute` renders Forbidden for insufficient role

---

## Build Order

```bash
pnpm build:shared
cd apps/backend && pnpm prisma:migrate && pnpm prisma:generate
pnpm build:backend
pnpm test
pnpm dev
```

---

## Verification

1. App redirects to OTP login (no password field)
2. Valid email → 6-digit HTML email received
3. Wrong OTP ×5 → locked out
4. Correct OTP → dashboard; JWT has `role` + `tenantId`
5. Logout-all from tab 1 → tab 2 next request returns 401
6. `therapist` role accessing admin route → inline Forbidden component
