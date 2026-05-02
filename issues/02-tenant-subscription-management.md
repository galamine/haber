# 02-tenant-subscription-management

## What to build

Tenant (clinic) lifecycle management: create/update/suspend/reactivate clinic, subscription plan assignment, feature flag evaluation, and plan-limit enforcement. Includes backend service, API routes, and frontend admin panel.

## Acceptance criteria

- [ ] `POST /v1/tenants` — create tenant with name, address, contact, time zone, plan assignment
- [ ] `PATCH /v1/tenants/:id` — update tenant details
- [ ] `POST /v1/tenants/:id/suspend` — soft suspend (sets `status=suspended`)
- [ ] `POST /v1/tenants/:id/reactivate` — reactivate tenant
- [ ] `GET /v1/tenants/:id` — returns tenant with plan features and limits
- [ ] `TenantService` with plan-limit checking (max_users_by_role, max_sensory_rooms, max_active_students)
- [ ] Feature flag evaluation (`plan.features.includes('per_tenant_branding')`)
- [ ] Prisma: Tenant model with subscription plan relation and feature flags JSON
- [ ] Frontend: Clinic settings page showing plan tier, features, and limits
- [ ] Integration tests: suspend/reactivate preserves data, limit enforcement returns 402

## Blocked by

- [01-foundation-schema-seed-data.md](./01-foundation-schema-seed-data.md)

## User stories

- #6: Super Admin creates subscription plans with max_users_by_role, max_sensory_rooms, max_active_students, feature_flags, tier
- #7: Super Admin suspends and reactivates a clinic without deleting data
- #8: Clinic Admin sees which plan features are enabled for my tier