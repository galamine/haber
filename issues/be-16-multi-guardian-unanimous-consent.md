# BE-16: Multi-Guardian & Unanimous Consent Model

## What to build

Support multiple guardians per child so that the unanimous consent model works as specified in the PRD: if any guardian withdraws consent, the child's `consentStatus` is set to `WITHDRAWN`. Consent is only `GRANTED` when all guardians have active consent.

**Packages:** `packages/db` + `packages/api` + `apps/web`

### Schema changes (`packages/db/prisma/schema/clinical.prisma`)

**1 — Allow multiple guardians per child:**

```prisma
model Guardian {
  id       String  @id @default(cuid())
  childId  String               // ← remove @unique
  userId   String?
  name     String
  relation String
  phone    String
  email    String?
  isPrimary Boolean @default(false)  // ← designate primary contact

  child Child @relation(fields: [childId], references: [id])

  @@map("guardian")
}
```

Run `pnpm db:migrate` to create the migration.

**2 — Tie ConsentRecord to a specific guardian:**

```prisma
model ConsentRecord {
  id          String      @id @default(cuid())
  childId     String
  guardianId  String                        // ← new FK
  consentType ConsentType
  typedName   String
  checkbox    Boolean
  timestamp   DateTime    @default(now())
  ip          String

  child    Child    @relation(fields: [childId], references: [id])
  guardian Guardian @relation(fields: [guardianId], references: [id])

  @@unique([guardianId, consentType])       // ← per-guardian per-type
  @@map("consent_record")
}
```

### API changes (`packages/api/src/routers/`)

**`child.ts` — update create:**
- Accept `guardians: { name, relation, phone, email }[]` (array)
- Create one `Guardian` row per entry; mark first as `isPrimary = true`

**`consent.ts` — update unanimous logic:**

- `consent.record`: accept `guardianId` input; create/update `ConsentRecord` for that guardian
- `consent.withdraw`: set `Child.consentStatus = WITHDRAWN` when any guardian withdraws; mark `blocked_by_consent = true` on all future PENDING sessions
- `consent.restore`: re-check all guardians for this child — only set `Child.consentStatus = GRANTED` if every guardian has TREATMENT + DATA_PROCESSING consent records with `checkbox = true`
- `consent.getStatus`: return per-guardian consent status list

**`consentInvitation.ts` — update send:**
- Accept `guardianId` to send invitation to a specific guardian
- Allow one invitation per guardian (currently one per child)

### Frontend changes (`apps/web`)

**Intake wizard Step 3 (`/children/new`):**
- Replace single guardian form with a `+ Add Guardian` repeater
- Require at least one guardian; allow up to N guardians
- Mark first as primary contact by default

**Child consent page (`/children/$childId/consent.tsx`):**
- Show per-guardian consent status grid (rows = guardians, columns = consent types)
- "Send Invitation" button per guardian
- Unanimous status banner (all must consent for GRANTED)

## Acceptance criteria

- [ ] Child can be created with 1–N guardians
- [ ] `ConsentRecord` is recorded per guardian per consent type
- [ ] Any guardian withdrawing consent sets `Child.consentStatus = WITHDRAWN`
- [ ] `consent.restore` only sets `GRANTED` if every guardian has all required consents
- [ ] `consentInvitation.send` sends invitation to a specific guardian by ID
- [ ] Consent status page shows per-guardian consent grid
- [ ] Existing single-guardian children are unaffected by the migration (existing Guardian rows are valid)
- [ ] `pnpm check-types` passes
- [ ] `pnpm db:migrate` runs without error

## Blocked by

- BE-05 (child CRUD) — already done; this extends it with a migration
