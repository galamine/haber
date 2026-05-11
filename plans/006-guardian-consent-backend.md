# Plan: Issue 006 — Guardian Consent (Backend)

## Context

Add a hard-gate consent system: all guardians for a child must explicitly consent to `treatment` and `data_processing` before clinical activities can begin. Consent is captured with a typed name, server-recorded timestamp, and server-recorded IP. Any withdrawal pauses clinical activities until a clinic admin resolves it.

### Decisions
- Consent types: `treatment` + `data_processing` only (no `media_capture`)
- `consentStatus` on `Child`: denormalized enum, updated by `evaluateConsentStatus()` — mirrors `evaluateIntakeComplete()` pattern
- `ipAddress` + `checkedAt`: server-side only (`req.ip`, `new Date()`) — not in request body
- Withdrawal: `clinic_admin` only (no guardian auth yet)
- `requireConsent` middleware: written but **not wired** (no Assessment/Session models exist yet)
- Notifications: email assigned therapists + clinic admin on withdrawal; session/plan pausing is a TODO
- New `child.consent` right: `clinic_admin` only
- `typedName`: non-empty string, no match against guardian's stored name
- Re-capture after withdrawal: always creates a **new** `ConsentRecord` row; withdrawn row preserved as audit trail

---

## Critical Files

| File | Change |
|---|---|
| `apps/backend/prisma/schema.prisma` | Add ConsentRecord model, enums, consentStatus on Child |
| `packages/shared/src/constants/roles.ts` | Add `child.consent` to clinic_admin |
| `packages/shared/src/schemas/child.schema.ts` | Add consent Zod schemas |
| `packages/shared/src/dtos/child.dto.ts` | Add consent DTO types |
| `apps/backend/src/services/child.service.ts` | Add `evaluateConsentStatus()` |
| `apps/backend/src/services/consent.service.ts` | New file |
| `apps/backend/src/services/email.service.ts` | Add `sendConsentWithdrawnEmail()` |
| `apps/backend/src/middlewares/requireConsent.ts` | New file (unwired) |
| `apps/backend/src/validations/consent.validation.ts` | New file |
| `apps/backend/src/controllers/consent.controller.ts` | New file |
| `apps/backend/src/routes/v1/child.route.ts` | Mount consent sub-routes |
| `apps/backend/tests/consent.test.ts` | New file |

---

## Step 1: Prisma Schema (`schema.prisma`)

Add enums:
```prisma
enum ConsentType {
  treatment
  data_processing
}

enum ConsentRecordStatus {
  active
  withdrawn
}

enum ChildConsentStatus {
  all_consented
  partial
  none
  withdrawn
}
```

Add model:
```prisma
model ConsentRecord {
  id              String              @id @default(uuid())
  guardianId      String
  childId         String
  type            ConsentType
  typedName       String
  checkedAt       DateTime
  ipAddress       String
  status          ConsentRecordStatus @default(active)
  withdrawnAt     DateTime?
  withdrawnReason String?
  createdAt       DateTime            @default(now())

  guardian Guardian @relation(fields: [guardianId], references: [id], onDelete: Cascade)
  child    Child    @relation(fields: [childId], references: [id], onDelete: Cascade)

  @@index([childId, type, status])
}
```

On `Child` model add:
```prisma
consentStatus  ChildConsentStatus @default(none)
consentRecords ConsentRecord[]
```

On `Guardian` model add:
```prisma
consentRecords ConsentRecord[]
```

Run: `cd apps/backend && pnpm prisma:migrate`

---

## Step 2: Shared Package

**`packages/shared/src/constants/roles.ts`**  
Add `'child.consent'` to the `clinic_admin` array only.

**`packages/shared/src/schemas/child.schema.ts`**  
Add:
```typescript
export const captureConsentSchema = z.object({
  guardianId: z.string().uuid(),
  type: z.enum(['treatment', 'data_processing']),
  typedName: z.string().min(1),
});

export const withdrawConsentSchema = z.object({
  reason: z.string().min(1),
});
```

**`packages/shared/src/dtos/child.dto.ts`**  
Add inferred DTO types for consent records and status responses.

Then rebuild: `pnpm build:shared`

---

## Step 3: `evaluateConsentStatus()` in `child.service.ts`

Add alongside `evaluateIntakeComplete()`. Accepts `childId` and a Prisma transaction client:

```typescript
const evaluateConsentStatus = async (childId: string, tx: PrismaTransactionClient) => {
  const guardians = await tx.guardian.findMany({ where: { childId, deletedAt: null } });
  if (guardians.length === 0) return 'none' as const;

  const activeRecords = await tx.consentRecord.findMany({ where: { childId, status: 'active' } });
  const withdrawnRecords = await tx.consentRecord.findMany({ where: { childId, status: 'withdrawn' } });

  const activeSet = new Set(activeRecords.map(r => `${r.guardianId}:${r.type}`));

  // withdrawn = a guardian+type has a withdrawn record with no active replacement
  const hasUnresolvedWithdrawal = withdrawnRecords.some(r => !activeSet.has(`${r.guardianId}:${r.type}`));
  if (hasUnresolvedWithdrawal) return 'withdrawn' as const;

  const allConsented = guardians.every(g =>
    (['treatment', 'data_processing'] as const).every(type => activeSet.has(`${g.id}:${type}`))
  );
  if (allConsented) return 'all_consented' as const;

  return activeRecords.length > 0 ? ('partial' as const) : ('none' as const);
};
```

After computing the status, write it back: `tx.child.update({ where: { id: childId }, data: { consentStatus: status } })`.

---

## Step 4: `consent.service.ts` (new)

```typescript
export const consentService = {
  captureConsent,
  withdrawConsent,
  getConsentStatus,
  getConsentHistory,
};
```

### `captureConsent(childId, guardianId, type, typedName, ipAddress, checkedAt, tenantId)`
1. Verify guardian belongs to child (same `childId`) — throw `ApiError(400)` if not
2. Check for existing active record for `guardianId + type`:
   - If exists → update `typedName`, `checkedAt`, `ipAddress` in place
   - If none (or only withdrawn) → create new `ConsentRecord` row
3. In same transaction: call `evaluateConsentStatus()` → write back to `Child.consentStatus`
4. Return the ConsentRecord

### `withdrawConsent(childId, consentId, reason)`
1. Find ConsentRecord by `consentId`
2. If `record.childId !== childId` → throw `ApiError(403, 'Forbidden')`
3. In transaction: set `status: withdrawn`, `withdrawnAt: new Date()`, `withdrawnReason: reason`
4. Call `evaluateConsentStatus()` → write back to `Child.consentStatus`
5. After commit: call `sendConsentWithdrawnEmail()` with relevant data

### `getConsentStatus(childId)`
Returns:
```typescript
{
  allConsented: boolean,
  consentStatus: ChildConsentStatus,
  guardians: Array<{
    guardianId: string,
    guardianName: string,
    consents: Array<{ type: ConsentType, status: ConsentRecordStatus, checkedAt: Date | null }>
  }>
}
```
Computed from latest active records per guardian+type.

### `getConsentHistory(childId)`
Returns all ConsentRecord rows for this child, ordered by `createdAt desc`. Includes IPs (clinic_admin only endpoint).

---

## Step 5: `email.service.ts` — Add `sendConsentWithdrawnEmail()`

```typescript
const sendConsentWithdrawnEmail = async (
  recipients: string[],
  childName: string,
  guardianName: string,
  consentType: string
) => { ... };
```

Subject: `"Consent withdrawn — ${childName}"`  
Body: `"${guardianName} has withdrawn ${consentType} consent for ${childName}. Clinical activities may be paused. Contact clinic admin to resolve."`

`// TODO: pause active sessions and treatment plan when those models exist (future issue)`

---

## Step 6: `requireConsent.ts` Middleware (new, unwired)

```typescript
// Not currently wired to any route — no Assessment/Session models exist yet.
// Wire as: router.post('/assessments', requireConsent, assessmentController.create)
export const requireConsent = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const childId = req.params.childId;
  const child = await prisma.child.findUnique({ where: { id: childId }, select: { consentStatus: true } });
  if (!child || child.consentStatus !== 'all_consented') {
    throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'CONSENT_REQUIRED');
  }
  next();
});
```

---

## Step 7: Validations (`consent.validation.ts`)

```typescript
export const consentValidation = {
  captureConsent: {
    params: z.object({ id: z.string().uuid() }),
    body: captureConsentSchema,
  },
  withdrawConsent: {
    params: z.object({ id: z.string().uuid(), consentId: z.string().uuid() }),
    body: withdrawConsentSchema,
  },
  getConsentHistory: {
    params: z.object({ id: z.string().uuid() }),
  },
};
```

---

## Step 8: Controller (`consent.controller.ts`)

```typescript
const captureConsent = catchAsync(async (req: AuthRequest, res: Response) => {
  const { id: childId } = req.params;
  const ipAddress = req.ip ?? 'unknown';
  const checkedAt = new Date();
  const result = await consentService.captureConsent(childId, req.body.guardianId, req.body.type, req.body.typedName, ipAddress, checkedAt);
  res.status(httpStatus.CREATED).send(result);
});

const withdrawConsent = catchAsync(async (req: AuthRequest, res: Response) => {
  await consentService.withdrawConsent(req.params.id, req.params.consentId, req.body.reason);
  res.status(httpStatus.NO_CONTENT).send();
});

const getConsentStatus = catchAsync(async (req: AuthRequest, res: Response) => {
  const status = await consentService.getConsentStatus(req.params.id);
  res.send(status);
});

const getConsentHistory = catchAsync(async (req: AuthRequest, res: Response) => {
  const history = await consentService.getConsentHistory(req.params.id);
  res.send(history);
});
```

---

## Step 9: Routes (`child.route.ts`)

Add under the existing child router:

```typescript
router.post('/:id/consent', auth('child.consent'), validate(consentValidation.captureConsent), consentController.captureConsent);
router.get('/:id/consent-status', auth(), consentController.getConsentStatus);
router.post('/:id/consent/:consentId/withdraw', auth('child.consent'), validate(consentValidation.withdrawConsent), consentController.withdrawConsent);
router.get('/:id/consent', auth('child.consent'), validate(consentValidation.getConsentHistory), consentController.getConsentHistory);
```

---

## Step 10: Tests (`tests/consent.test.ts`)

Use `setupTestDB` pattern. Create fixture: clinic, clinic_admin user, child with 2 guardians, assigned therapist.

| # | Test |
|---|---|
| 1 | Child with 2 guardians: `allConsented: false` until both have both types |
| 2 | Guardian 1 (both types) + guardian 2 (both types) → `allConsented: true` |
| 3 | `requireConsent` middleware returns 422 `CONSENT_REQUIRED` when `consentStatus !== all_consented` |
| 4 | Withdraw treatment consent → `consentStatus: withdrawn` → therapist email queued |
| 5 | Re-capture after withdrawal → new ConsentRecord row created → `allConsented: true` restored |
| 6 | `consentId` from different child returns 403 |

---

## Verification

```bash
pnpm build:shared
cd apps/backend && pnpm prisma:migrate
pnpm test -- consent.test.ts
pnpm coverage
```
