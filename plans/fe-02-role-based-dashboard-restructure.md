# FE-02: Role-Based Dashboard Restructure + Clinic Admin Invitation

## Context

The app currently has a single sidebar (`AppShell`) that filters nav items by role, but the filtering is inconsistent — SUPER_ADMIN sees clinic-level items (Staff, Departments, Rooms) that don't apply to them, and the `/settings/*` routes have no `beforeLoad` guards (nav-visibility-only). The dashboard page is a placeholder for all roles. There is also no path for a super admin to invite the first CLINIC_ADMIN after creating a clinic.

This plan cleans up the nav per role, adds proper route guards, and implements the missing clinic admin invitation flow.

---

## Current State

### Route files
| Route | Purpose | Current Guard |
|---|---|---|
| `/dashboard` | Placeholder for all roles | none |
| `/platform/clinics` | Clinic list | `beforeLoad` SUPER_ADMIN check |
| `/platform/clinics/new` | Create clinic | `beforeLoad` SUPER_ADMIN check |
| `/settings/staff` | Staff list | nav visibility only |
| `/settings/staff/invite` | Invite staff | nav visibility only |
| `/settings/staff/$staffId` | Staff detail | nav visibility only |
| `/settings/departments` | Departments | nav visibility only |
| `/settings/rooms` | Sensory rooms | nav visibility only |

### Current AppShell NAV_ITEMS problems
- SUPER_ADMIN sees Staff, Clinic Settings, Sensory Rooms — none apply to them
- Placeholder items (Children, Sessions Today, Assessments, Treatment Plans, Reports) all point to `/dashboard` — dead weight until real pages exist

---

## Target Nav Per Role

**Super Admin** — one item only:
| Label | Route | Icon |
|---|---|---|
| Clinics | `/platform/clinics` | Shield |

**Clinic Admin** — starting set (grows as pages are built):
| Label | Route | Icon |
|---|---|---|
| Dashboard | `/dashboard` | LayoutDashboard |
| Staff | `/settings/staff` | Users |
| Departments | `/settings/departments` | Settings |
| Sensory Rooms | `/settings/rooms` | Building2 |

**Therapist / Staff** — starting set:
| Label | Route | Icon |
|---|---|---|
| Dashboard | `/dashboard` | LayoutDashboard |

Placeholder nav items (Children, Sessions, Assessments, etc.) are removed until real pages exist.

---

## Implementation Steps

### Step 1 — Rebuild NAV_ITEMS in AppShell

**File**: `apps/web/src/components/shell/AppShell.tsx`

Replace the existing `NAV_ITEMS` array with clean per-role lists. Remove all placeholder items that point to `/dashboard`. Keep only items that have real routes.

### Step 2 — Super Admin landing redirect

**File**: `apps/web/src/routes/_authenticated/dashboard.tsx`

Add `beforeLoad` to redirect SUPER_ADMIN to `/platform/clinics`:

```ts
beforeLoad: () => {
  if (useAuthStore.getState().role === "SUPER_ADMIN") {
    throw redirect({ to: "/platform/clinics" });
  }
}
```

### Step 3 — Add route-level guards to `/settings/*`

Add a `beforeLoad` guard (role !== "CLINIC_ADMIN" → redirect to "/dashboard") to all five settings routes:

- `apps/web/src/routes/_authenticated/settings/staff/index.tsx`
- `apps/web/src/routes/_authenticated/settings/staff/invite.tsx`
- `apps/web/src/routes/_authenticated/settings/staff/$staffId.tsx`
- `apps/web/src/routes/_authenticated/settings/departments.tsx`
- `apps/web/src/routes/_authenticated/settings/rooms.tsx`

Pattern (same as existing platform routes):
```ts
beforeLoad: () => {
  if (useAuthStore.getState().role !== "CLINIC_ADMIN") {
    throw redirect({ to: "/dashboard" });
  }
}
```

### Step 4 — Backend: `clinic.inviteAdmin` procedure

**File**: `packages/api/src/routers/clinic.ts`

Add at top (matching `staff.ts`):
```ts
import { env } from "@haber-final/env/server";
import { Resend } from "resend";
import { generateOtp, hashValue } from "../lib/otp";
```

Add mutation under `adminProcedure`:
```ts
inviteAdmin: adminProcedure
  .input(z.object({ clinicId: z.string(), email: z.string().email() }))
  .mutation(async ({ input }) => {
    // 1. Verify clinic exists (deletedAt: null)
    // 2. Check email not already registered → CONFLICT if so
    // 3. prisma.$transaction: create user (role: CLINIC_ADMIN, clinicId) + OTP row
    // 4. resend.emails.send invite email with OTP code
    return { message: "Invite sent" };
  }),
```

Full logic mirrors `staff.invite` in `packages/api/src/routers/staff.ts:31-92` (same OTP/Resend pattern, no permissions/departments needed).

### Step 5 — Frontend: Two-step clinic creation + admin invite

**File**: `apps/web/src/routes/_authenticated/platform/clinics/new.tsx`

Add local state to track the created clinic:
```ts
const [clinicId, setClinicId] = useState<string | null>(null);
```

- **Step 1** (existing form): `onSuccess` saves `clinic.id` → `setClinicId(clinic.id)` instead of navigating away
- **Step 2** (new): single email field form
  - "Send Invite" → `trpc.clinic.inviteAdmin({ clinicId, email })` → success toast → navigate to `/platform/clinics`
  - "Skip" button → navigate to `/platform/clinics` with no user created

No new route files, no DB migrations.

---

## Files Modified

| File | Change |
|---|---|
| `apps/web/src/components/shell/AppShell.tsx` | Rebuild `NAV_ITEMS` with clean per-role separation |
| `apps/web/src/routes/_authenticated/dashboard.tsx` | Add `beforeLoad` redirect for SUPER_ADMIN |
| `apps/web/src/routes/_authenticated/settings/staff/index.tsx` | Add CLINIC_ADMIN route guard |
| `apps/web/src/routes/_authenticated/settings/staff/invite.tsx` | Add CLINIC_ADMIN route guard |
| `apps/web/src/routes/_authenticated/settings/staff/$staffId.tsx` | Add CLINIC_ADMIN route guard |
| `apps/web/src/routes/_authenticated/settings/departments.tsx` | Add CLINIC_ADMIN route guard |
| `apps/web/src/routes/_authenticated/settings/rooms.tsx` | Add CLINIC_ADMIN route guard |
| `packages/api/src/routers/clinic.ts` | Add `inviteAdmin` mutation |
| `apps/web/src/routes/_authenticated/platform/clinics/new.tsx` | Add step 2 invite admin form |

---

## Verification

1. `pnpm check-types` — zero errors
2. **SUPER_ADMIN**: log in → lands on `/platform/clinics` → sidebar shows only "Clinics" → create clinic → step 2 invite form appears → send invite → check CLINIC_ADMIN user + OTP in DB → navigating to `/settings/staff` redirects away
3. **CLINIC_ADMIN** (use OTP from invite): log in → `/dashboard` → sidebar shows Dashboard, Staff, Departments, Sensory Rooms → all pages load correctly
4. **THERAPIST**: log in → `/dashboard` → sidebar shows only Dashboard → `/settings/*` and `/platform/*` redirect away
