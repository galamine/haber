# Plan: Issue 006 — Guardian Consent (Frontend)

## Context

Add a Consent step (Step 5) to the child intake wizard and surface consent status throughout the child detail page. Consent captures typed names + checkboxes per guardian for `treatment` and `data_processing`. Clinic admins can withdraw consent via a modal; withdrawals show a paused banner on the detail page.

### Decisions
- Consent capture is **Step 5** in the wizard (after Anthropometrics)
- Each guardian gets two checkboxes (treatment, data_processing) + a typed name field
- No IP or timestamp fields in the UI — both captured server-side
- Withdrawal is clinic_admin only; triggers a confirmation modal with a required reason field
- Consent status indicator lives in the child detail page header
- Withdrawal banner shows below the header when `consentStatus === 'withdrawn'`
- Use existing component primitives: `Alert`, `Dialog`, `Checkbox`, `Input`, `Button` from `components/ui/`
- Follow the existing `useMutation` + query invalidation pattern from `useChildren.ts`

---

## Critical Files

| File | Change |
|---|---|
| `apps/frontend/src/api/consent.ts` | New file |
| `apps/frontend/src/hooks/useConsent.ts` | New file |
| `apps/frontend/src/pages/children/ChildCreatePage.tsx` | Add Step 5 |
| `apps/frontend/src/pages/children/ChildDetailPage.tsx` | Status indicator + withdrawal banner + consent history |
| `apps/frontend/src/components/WithdrawConsentModal.tsx` | New file |

Depends on backend plan completing first (shared package DTOs must be built before frontend can import types).

---

## Step 1: `api/consent.ts` (new)

Follow the pattern in `api/children.ts`:

```typescript
import { apiClient } from './client';
import type { CaptureConsentDto, WithdrawConsentDto, ConsentStatusDto, ConsentRecordDto } from '@haber/shared/dtos';

const BASE = (childId: string) => `/v1/children/${childId}`;

export const consentApi = {
  capture: (childId: string, body: CaptureConsentDto) =>
    apiClient.post<ConsentRecordDto>(`${BASE(childId)}/consent`, body),

  getStatus: (childId: string) =>
    apiClient.get<ConsentStatusDto>(`${BASE(childId)}/consent-status`),

  withdraw: (childId: string, consentId: string, body: WithdrawConsentDto) =>
    apiClient.post<void>(`${BASE(childId)}/consent/${consentId}/withdraw`, body),

  getHistory: (childId: string) =>
    apiClient.get<ConsentRecordDto[]>(`${BASE(childId)}/consent`),
};
```

---

## Step 2: `hooks/useConsent.ts` (new)

Follow the pattern in `hooks/useChildren.ts`:

```typescript
export const consentKeys = {
  status: (childId: string) => ['consent', 'status', childId] as const,
  history: (childId: string) => ['consent', 'history', childId] as const,
};

export const useConsentStatus = (childId: string) =>
  useQuery({ queryKey: consentKeys.status(childId), queryFn: () => consentApi.getStatus(childId) });

export const useConsentHistory = (childId: string) =>
  useQuery({ queryKey: consentKeys.history(childId), queryFn: () => consentApi.getHistory(childId) });

export const useCaptureConsent = (childId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CaptureConsentDto) => consentApi.capture(childId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: consentKeys.status(childId) }),
  });
};

export const useWithdrawConsent = (childId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ consentId, body }: { consentId: string; body: WithdrawConsentDto }) =>
      consentApi.withdraw(childId, consentId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: consentKeys.status(childId) }),
  });
};
```

---

## Step 3: Wizard Step 5 — `ChildCreatePage.tsx`

### State additions
```typescript
// Per-guardian consent state: guardianId → { typedName, treatment: boolean, data_processing: boolean }
const [consentForms, setConsentForms] = useState<Record<string, ConsentFormState>>({});
```

Initialize `consentForms` entries when guardians are added in Step 2 (same pattern as how guardians are appended to the `guardians` state array).

### Step 5 UI structure

One section per guardian:
```
Guardian name (heading)

☐ I consent to treatment
☐ I consent to data processing

[Type your full name to sign]   ← Input, required before submit
```

After all consents submitted:
```
<Alert variant="success">All consents given</Alert>
```

### Submit logic (`handleStep5Submit`)
- Validate: for each guardian, `typedName` must be non-empty AND checkbox must be checked before calling the API for that type
- Call `captureConsent({ guardianId, type, typedName })` per guardian × type — use `Promise.all` for concurrent submission
- Show `toast.success` via sonner on completion
- After all calls: `consentStatus` query auto-refreshes via invalidation

### Step navigation
- Add Step 5 to the steps array/stepper after Step 4
- "Finish" button enabled only when `consentStatus?.allConsented === true`
- Skipping Step 5 is allowed (show a warning toast but don't block navigation) — consent can be completed later

---

## Step 4: Child Detail Page — `ChildDetailPage.tsx`

### Add consent status query
```typescript
const { data: consentData } = useConsentStatus(childId);
```

### Header status indicator
Place next to child name/code in the existing page header:

```typescript
const statusIcon = match(consentData?.consentStatus)
  .with('all_consented', () => <LockKeyhole className="text-green-600" size={18} />)
  .with('withdrawn',     () => <AlertTriangle className="text-red-600" size={18} />)
  .otherwise(           () => <AlertTriangle className="text-amber-500" size={18} />);
```

Wrap in a `<Tooltip>` showing the status label text.

### Withdrawal banner
Render immediately below the header, only when `consentStatus === 'withdrawn'`:

```tsx
<Alert variant="destructive">
  Clinical activities paused — guardian consent withdrawn. Contact clinic admin to resolve.
</Alert>
```

### Consent history section (clinic_admin only)
Add a collapsible section or tab on the detail page:
- Table columns: Guardian, Type, Status, Signed at, Withdrawn at
- "Withdraw" button per active record → opens `WithdrawConsentModal`
- Only render when caller's role is `clinic_admin` (read from auth store)
- Data from `useConsentHistory(childId)`

---

## Step 5: `WithdrawConsentModal.tsx` (new)

```typescript
interface Props {
  open: boolean;
  onClose: () => void;
  childId: string;
  consentId: string;
  guardianName: string;
  consentType: 'treatment' | 'data_processing';
}
```

UI using existing `Dialog` + `Button` + `Textarea` primitives:
```
Title:   "Withdraw consent for {guardianName}?"
Body:    Consent type label
         Textarea — reason (required, min 1 char)
Footer:  [Cancel]  [Confirm Withdrawal (destructive)]
```

`handleConfirm`: calls `useWithdrawConsent` → on success: `toast.success('Consent withdrawn')` → `onClose()`  
Confirm button disabled while `isPending` or reason is empty.

---

## Verification

```bash
# Backend must be running with migrations applied first
pnpm dev

# Manual QA:
# 1. Create child with 2 guardians → reach Step 5
# 2. Submit consent for guardian 1 only → verify amber icon on detail page
# 3. Submit consent for guardian 2 → verify green lock icon
# 4. Finish button should now be enabled
# 5. As clinic_admin on detail page: click Withdraw for guardian 2's treatment consent → enter reason → confirm
# 6. Verify red icon + "Clinical activities paused" banner
# 7. Re-open wizard Step 5 → re-capture guardian 2's treatment consent → verify banner clears
```
