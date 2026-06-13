# TEST-01: Auth, Tenant & Staff Test Suite

## What to build

Integration and E2E tests for the `AuthService`, tenant management, and staff management. Tests run against a real test database (no mocks).

**Packages:** `packages/api` (Vitest integration tests)

Reference: `packages/api/vitest.config.ts`

### Test file locations

```
packages/api/src/__tests__/auth.test.ts
packages/api/src/__tests__/staff.test.ts
packages/api/src/__tests__/tenant.test.ts
```

### AuthService tests (`auth.test.ts`)

```
describe("OTP rate limiting")
  - 4th OTP request within 10 min returns TOO_MANY_REQUESTS
  - 5th wrong code attempt invalidates the OTP; further attempts return UNAUTHORIZED
  - Correct code on attempt 3 returns valid tokens

describe("OTP verification")
  - Successful OTP verification sets User.emailVerified = true
  - JWT access token contains { sub, role, tenantId } claims
  - SuperAdmin JWT has tenantId = null

describe("Refresh token rotation")
  - Reusing an already-rotated token sets reuseDetected=true and revokes session family
  - auth.logoutAll revokes all refresh tokens for the user

describe("Session expiry")
  - Calling a protected procedure after 24h idle returns UNAUTHORIZED
```

### Staff tests (`staff.test.ts`)

```
describe("Staff invite")
  - staff.invite creates User with correct role and loginEnabled=true
  - staff.invite sends OTP via Resend (mock Resend in tests)

describe("Deactivation")
  - staff.deactivate sets loginEnabled=false
  - Deactivated user cannot refresh tokens

describe("Permissions")
  - staff.updatePermissions adds permission; hasPermission returns true for that permission
  - Therapist calling ClinicAdmin procedure returns FORBIDDEN
```

### Tenant tests (`tenant.test.ts`)

```
describe("Clinic management")
  - clinic.create (SuperAdmin) creates a clinic
  - clinic.platformSummary returns correct active-children count
  - ClinicAdmin cannot call clinic.create

describe("Department & room management")
  - clinic.createDepartment scoped to ClinicAdmin's clinic
  - clinic.createSensoryRoom creates room; toggle changes status
```

### Test infrastructure requirements

- Vitest with real PostgreSQL test database (use `TEST_DATABASE_URL` env var)
- `beforeEach`: truncate test tables; seed a clinic, SuperAdmin, ClinicAdmin, and Therapist user
- `afterAll`: close Prisma connection

## Acceptance criteria

- [ ] All described test cases are implemented
- [ ] OTP invalidation after 5 wrong attempts is verified
- [ ] Rate limit (3/10min) is verified
- [ ] Reuse detection is verified
- [ ] `pnpm --filter api test` runs all tests and passes (green)
- [ ] No database mocks — all tests hit the real test database

## Blocked by

- BE-04 (Staff management must be implemented before staff tests can run)
