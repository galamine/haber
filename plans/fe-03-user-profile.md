# FE-03: User Profile — Login OTP Fix & Profile Completion Onboarding

## Context

Two issues need addressing:

1. **OTP paste/backspace** — User Story #3 requires secure OTP login with copy/paste and backspace support. The `input-otp` library (v1.4.2) natively handles paste, copy, and backspace behavior. A previous commit (`bea044c`) replaced the manual OTP input with the shadcn `InputOTP` component, enabling this functionality.

2. **Profile completion** — User Story #2 states: "As a Clinic Admin, I want to receive an invite email with OTP, complete my profile, and sign in." Currently, after accepting an invitation (THERAPIST, STAFF, or CLINIC_ADMIN), users are taken directly to the dashboard with no profile on file. A `UserProfile` model and completion flow must be added.

---

## Files to Create / Modify

```
apps/web/src/routes/
  └── user-profile.tsx           → /user-profile

packages/api/src/
  └── routers/
      └── profile.ts             — tRPC router (new)

packages/api/src/schemas/
  └── profile.ts                 — Zod schemas (new)

packages/db/prisma/schema/
  └── auth.prisma               — add UserProfile model
```

Also modify:
- `packages/api/src/routers/index.ts` — register `profile` router
- `apps/web/src/routes/accept-invite.tsx` — redirect to profile if not exists
- `apps/web/src/routes/_authenticated/dashboard.tsx` — add profile guard

---

## Part 1: OTP Paste & Backspace Fix

Commit `bea044c` replaced the manual OTP input with the shadcn `InputOTP` component from `@haber-final/ui/components/input-otp`. The `input-otp` library handles copy/paste from clipboard, backspace to delete digits, browser autofill from SMS, and touch-friendly input on iOS/Android.

No further frontend changes needed — this part is done.

---

## Part 2: User Profile Completion

### 2.1 Prisma Model

**File:** `packages/db/prisma/schema/auth.prisma`

Add `UserProfile` model with one-to-one relation to `User`. Fields: id (String, PK), userId (String, unique FK), name (String), dateOfBirth (DateTime), district (String), state (String), phoneNumber (String), createdAt (DateTime), updatedAt (DateTime).

Add `profile UserProfile?` relation to existing `User` model.

Run `pnpm db:push` to apply schema changes.

### 2.2 Backend: Zod Schemas

**File:** `packages/api/src/schemas/profile.ts` (new)

Schema: `CreateProfileInput` with fields name, dateOfBirth, district, state, phoneNumber (all required strings). `UpdateProfileInput` is partial of Create.

### 2.3 Backend: tRPC Router

**File:** `packages/api/src/routers/profile.ts` (new)

Router with three procedures:
- `get` — protectedProcedure query, returns UserProfile or null
- `create` — protectedProcedure mutation, creates profile if not exists, throws CONFLICT if exists
- `update` — protectedProcedure mutation, upserts profile

Register in `packages/api/src/routers/index.ts` as `profile: profileRouter`.

### 2.4 Frontend: Profile Completion Route

**File:** `apps/web/src/routes/user-profile.tsx` (new)

Route: `/user-profile`

Pattern: `useForm` + `zodResolver` (same as `children/new.tsx`).

**Route guard:** authenticated users only.

**Layout:** centered card page with title, profile form, submit button.

**Form fields:**
- Full Name — `<Input>`
- Date of Birth — `<Input type="date">`
- District — `<Input>`
- State — `<Input>`
- Phone Number — `<Input type="tel">`

Each field: `<Label>` above + `<Input>` + error message below.

**Actions:**
- Submit → `trpc.profile.create.mutation` → `toast.success` + navigate to `/dashboard`
- Error → `toast.error(err.message)`

### 2.5 Flow Changes

**`accept-invite.tsx`:** After successful `verifyOtp`, navigate directly to `/user-profile` (no profile check needed for newly invited users).

**`dashboard.tsx`:** Add `beforeLoad` guard — if `trpc.profile.get` returns null, redirect to `/user-profile`. SUPER_ADMIN bypasses this check and goes to `/platform/clinics`.

---

## Verification Checklist

1. `pnpm db:push` — apply schema changes
2. `pnpm check-types` — zero errors
3. **OTP paste**: Login as existing user → copy 6-digit code → paste → backspace works
4. **Invite THERAPIST**: Create invite → accept → lands on `/user-profile` → fill form → submit → dashboard
5. **Invite STAFF**: Same as THERAPIST
6. **Invite CLINIC_ADMIN**: Same as THERAPIST
7. **Seed user login**: Existing user with no profile → redirected to `/user-profile` → complete → dashboard
8. **Relogin**: User with profile → goes straight to dashboard
9. **Dashboard guard**: Access `/dashboard` without profile → redirects to `/user-profile`

---

## Blocked by

- `issue-fe-02` — done
- `issue-fe-03` (Initial Assessment Form) — done
