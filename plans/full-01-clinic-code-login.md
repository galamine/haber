# Plan : Clinic Code in OTP Login

## Context

Add a 6-character alphanumeric clinic code to the OTP login flow. The code is manually entered by super admins when creating a clinic and is required for all non-SUPER_ADMIN users during login. Super admins use only OTP (no clinic code).

**Existing flow:**
- User enters email → `requestOtp` → enters 6-digit OTP → `verifyOtp` → logged in
- No clinic code validation exists anywhere

**Key files NOT to modify:**
- `packages/api/src/lib/otp.ts` — OTP generation/hashing logic unchanged
- `packages/api/src/lib/rate-limit.ts` — rate limiting unchanged
- `packages/api/src/lib/jwt.ts` — JWT signing unchanged

## Decisions

| Question | Decision |
|---|---|
| Where to enter clinic code? | OTP section — after email is submitted, backend returns role, UI shows clinic code only for non-SUPER_ADMIN |
| How does UI know user's role? | `requestOtp` response includes `role` field |
| How to validate clinic code? | `verifyOtp` checks `clinicCode` matches user's `clinic.code` for non-SUPER_ADMIN users |
| Clinic code format? | 6-char alphanumeric, uppercase, stored as-is in DB |

## Files to Create

(none)

## Files to Modify

| File | Change |
|---|---|
| `packages/db/prisma/schema/clinic.prisma` | Add `code String? @unique` to Clinic model |
| `packages/api/src/schemas/clinic.ts` | Add `code: z.string().length(6).regex(/^[A-Z0-9]+$/i)` to CreateClinicInput; `code: z.string().optional()` to UpdateClinicInput |
| `packages/api/src/routers/clinic.ts` | Pass `code` field to `prisma.clinic.create` |
| `packages/api/src/schemas/index.ts` | Add `clinicCode?: string` to RequestOtpInput and VerifyOtpInput; add `role` to RequestOtpOutput |
| `packages/api/src/routers/auth.ts` | `requestOtp`: return `{ success: true, role }`; `verifyOtp`: validate clinicCode for non-SUPER_ADMIN users |
| `apps/web/src/routes/login.tsx` | Add `clinicCode` state; show clinic code input on OTP step only when role !== SUPER_ADMIN; pass clinicCode to verifyOtp |
| `apps/web/src/routes/_authenticated/platform/clinics/new.tsx` | Add clinic code input field (required, 6-char alphanumeric uppercase) |

## Step 1 — Add `code` field to Clinic model

Add optional unique `code` field to the Clinic Prisma model.

**`packages/db/prisma/schema/clinic.prisma`**
```prisma
model Clinic {
  id           String      @id @default(cuid())
  code         String?     @unique
  // ... existing fields
}
```

## Step 2 — Update Clinic schemas

Add `code` to CreateClinicInput (required) and UpdateClinicInput (optional).

**`packages/api/src/schemas/clinic.ts`**
```typescript
export const CreateClinicInput = z.object({
  code: z.string().length(6).regex(/^[A-Z0-9]+$/i, "Must be 6 alphanumeric characters"),
  // ... existing fields
});

export const UpdateClinicInput = z.object({
  id: z.string(),
  code: z.string().length(6).regex(/^[A-Z0-9]+$/i).optional(),
  // ... existing fields
});
```

## Step 3 — Update Clinic router to pass `code`

Pass `code` to `prisma.clinic.create`.

**`packages/api/src/routers/clinic.ts`** (in `create` mutation):
```typescript
return prisma.clinic.create({ data: { ...input } });
```

## Step 4 — Update Auth schemas

Add `clinicCode` to both inputs, add `role` to requestOtp output.

**`packages/api/src/schemas/index.ts`**
```typescript
export const RequestOtpInput = z.object({
  email: z.string().email(),
  clinicCode: z.string().optional(),
});

export const VerifyOtpInput = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  clinicCode: z.string().optional(),
});

export const RequestOtpOutput = z.object({
  success: z.boolean(),
  role: UserRoleSchema,
});
```

## Step 5 — Update requestOtp to return role

**`packages/api/src/routers/auth.ts`** — `requestOtp` mutation:
```typescript
return { success: true, role: user.role };
```

## Step 6 — Update verifyOtp to validate clinicCode

For non-SUPER_ADMIN users, `clinicCode` must match their `clinic.code`.

**`packages/api/src/routers/auth.ts`** — `verifyOtp` mutation (after user lookup):
```typescript
if (user.role !== "SUPER_ADMIN") {
  if (!input.clinicCode) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Clinic code required" });
  }
  const clinic = await prisma.clinic.findUnique({ where: { code: input.clinicCode } });
  if (!clinic || clinic.id !== user.clinicId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid clinic code" });
  }
}
```

## Step 7 — Add clinic code to New Clinic form

**`apps/web/src/routes/_authenticated/platform/clinics/new.tsx`**
- Add `code` field to ClinicFormValues type
- Add FormField for clinic code input
- Pass `code` to createMutation

## Step 8 — Update Login UI

**`apps/web/src/routes/login.tsx`**
- Add `clinicCode` state (`useState<string>("")`)
- After `requestOtp` succeeds, store `role` from response
- In OTP step: render clinic code input only when `role !== "SUPER_ADMIN"`
- On `verifyOtp`: pass `{ email, code: otp, clinicCode: role !== "SUPER_ADMIN" ? clinicCode : undefined }`

## Verification

- [ ] Super admin can create clinic with 6-char alphanumeric code
- [ ] Super admin login: no clinic code field shown on OTP step, only OTP required
- [ ] Non-superadmin login: clinic code field shown on OTP step, both OTP + clinic code required
- [ ] Wrong clinic code for non-superadmin → UNAUTHORIZED error on verify
- [ ] `pnpm db:push` applies schema without errors
- [ ] `pnpm check-types` passes
