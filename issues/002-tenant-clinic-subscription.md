# 002 — Tenant, Clinic & Subscription Setup [AFK]

**Type:** AFK  
**PRD User Stories:** 1, 6, 7, 8

## What to build

Introduce multi-tenancy as a first-class concept. A `Clinic` is a tenant; each `User` belongs to at most one clinic (super admins belong to none). A `SubscriptionPlan` controls what each clinic can do. Super Admins onboard new clinics and assign plans. All subsequent resources (students, staff, sessions) are scoped to a `tenant_id` extracted from the JWT.

## Acceptance criteria

**Schema / migrations**
- [ ] `SubscriptionPlan` model: `id`, `name`, `tier` enum (`basic` | `advanced` | `enterprise`), `max_users_by_role` (JSONB: `{ doctor: n, therapist: n, staff: n }`), `max_sensory_rooms` (int), `max_active_students` (int), `feature_flags` (JSONB: e.g. `{ sms_notifications: false, per_tenant_branding: false }`), `createdAt`, `updatedAt`
- [ ] `Clinic` model: `id`, `name`, `address`, `contactPhone`, `contactEmail`, `timezone`, `subscriptionPlanId` (FK), `status` enum (`active` | `suspended`), `createdAt`, `updatedAt`
- [ ] `User.tenantId` foreign key to `Clinic` (nullable; super admins have null)
- [ ] `User.tenantId` is indexed for tenant-scoped queries

**API endpoints**
- [ ] `POST /super-admin/clinics` — create clinic (super_admin only): name, address, contact, timezone, subscriptionPlanId; returns created clinic
- [ ] `GET /super-admin/clinics` — list all clinics with pagination (super_admin only)
- [ ] `GET /super-admin/clinics/:clinicId` — clinic detail (super_admin only)
- [ ] `PATCH /super-admin/clinics/:clinicId` — update name/address/contact/timezone (super_admin only)
- [ ] `POST /super-admin/clinics/:clinicId/suspend` — set status to `suspended` (super_admin only)
- [ ] `POST /super-admin/clinics/:clinicId/reactivate` — set status to `active` (super_admin only)
- [ ] `POST /super-admin/subscription-plans` — create plan (super_admin only)
- [ ] `GET /super-admin/subscription-plans` — list all plans (super_admin only)
- [ ] `PATCH /super-admin/subscription-plans/:planId` — update plan (super_admin only)
- [ ] `GET /clinic/me` — clinic admin sees their own clinic details and active plan features (clinic_admin only)
- [ ] All non-super-admin routes enforce `tenant_id` from JWT — requests cannot access other tenants' data
- [ ] Suspended clinic: all API calls by that clinic's users return 403 with `CLINIC_SUSPENDED` error code

**Frontend**
- [ ] Super Admin nav item: "Clinics"
- [ ] Clinic list page (super_admin only): table with name, tier, status, active student count, actions (suspend / reactivate / edit)
- [ ] Clinic create/edit form: name, address, contact phone/email, timezone (dropdown), subscription plan selector
- [ ] Subscription plan list and create form (super_admin only)
- [ ] Clinic admin "My Clinic" page: shows plan tier, feature flags, and current usage vs. limits (e.g., 12 / 20 active students)

**Tests**
- [ ] Super admin creates a clinic — clinic appears in list with `active` status
- [ ] Super admin suspends a clinic — clinic admin's next API call returns 403 `CLINIC_SUSPENDED`
- [ ] Super admin reactivates the clinic — clinic admin's API calls succeed again
- [ ] Clinic admin cannot read or modify another clinic's data (tenant isolation)
- [ ] User with `tenant_id = null` (super admin) can access all clinics
- [ ] Subscription plan `max_active_students` limit is surfaced correctly in clinic detail

## QA / Manual testing

- [ ] Log in as super_admin → navigate to Clinics → click "New Clinic" → fill in name, address, timezone, assign a plan → save → verify clinic appears in list with status "active"
- [ ] Click "Suspend" on the new clinic → log in as that clinic's admin → verify you see a "Clinic suspended" error on any page
- [ ] Back as super_admin, click "Reactivate" → log back in as clinic admin → verify access is restored
- [ ] Open "My Clinic" as clinic_admin → verify the plan tier, feature flags, and usage counters are displayed

## Blocked by

- Issue 001 — Auth Reform: OTP + Role Expansion
