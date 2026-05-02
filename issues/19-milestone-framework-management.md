# 19-milestone-framework-management

## What to build

Milestone framework management: global canonical milestones seeded by HaberApp (clinical advisor sign-off required on seed content), clinic-specific milestone extensions, milestone hierarchy with parent_id, age bands, scoring scales.

## Acceptance criteria

- [ ] `GET /v1/milestones` — list all milestones (filterable by framework_id: 'canonical' or 'clinic_{tenant_id}')
- [ ] `GET /v1/milestones/:id` — get milestone with children
- [ ] `POST /v1/milestones` — create clinic-specific milestone (with `framework_id = 'clinic_{tenant_id}'`)
- [ ] `PATCH /v1/milestones/:id` — update clinic-specific milestone
- [ ] `GET /v1/milestones/tree` — returns full hierarchy tree (for picker UI)
- [ ] Milestone fields: id, framework_id ('canonical' or 'clinic_{id}'), age_band_min_months, age_band_max_months, scoring_scale_min, scoring_scale_max, description, parent_milestone_id
- [ ] Clinic-specific milestones stored in same table with `framework_id` filter
- [ ] Sub-category management: `GET /v1/game-categories/:id/sub-categories` — list sub-categories
- [ ] `POST /v1/game-categories/:id/sub-categories` — create tenant-specific sub-category extension
- [ ] Prisma: Milestone model with self-referential parent_id, framework_id index
- [ ] Frontend: Milestone picker in assessment form (tree view with search), milestone editor for Clinic Admin
- [ ] Integration tests: milestone hierarchy loads correctly, clinic extensions are tenant-isolated

## Blocked by

- [01-foundation-schema-seed-data.md](./01-foundation-schema-seed-data.md)

## User stories

- #65: Super Admin or clinical advisor seeds canonical milestone framework (milestone ID, age band in months, scoring scale min/max, description, parent milestone ID for hierarchy)
- #66: Clinic Admin adds clinic-specific milestones as extensions (with `milestone.framework_id = 'clinic_{tenant_id}'`)
- #67: Clinic Admin manages 10 global game categories with sub-categories, plus tenant-specific sub-category extensions

## QA checklist

- [ ] Canonical milestones are read-only for clinic admins
- [ ] Clinic-specific milestones are editable only by that clinic's admin
- [ ] Milestone tree loads without circular reference errors
- [ ] Age band validation: min <= max
- [ ] Scoring scale validation: min <= max
- [ ] Sub-category creation extends, not replaces, global sub-categories
- [ ] Milestone picker shows only leaf-level milestones for tagging