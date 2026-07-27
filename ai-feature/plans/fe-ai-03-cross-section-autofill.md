# FE-AI-03: AI Documentation — Cross-Section Auto-fill

## Context

Stage 6 (FE-AI-02) is done: Real-time form updates are working. This stage ensures AI fills ANY section — not just the one therapist is currently viewing. As therapist discusses topics, relevant facts go to their appropriate sections regardless of navigation.

## Decisions

| Question | Decision |
|---|---|
| Why no additional files? | This is already handled by the existing architecture |
| How does cross-section work? | AI extracts facts from full transcript; field IDs include section prefix (e.g., `sectionC.milestones`) |
| Does therapist need to navigate to see filled fields? | No — useAIFieldUpdates polls all draft values regardless of active tab |

## Files to Create

None — this stage is about ensuring the existing architecture correctly supports cross-section filling.

## Files to Modify

| File | Change |
|---|---|
| `ai-feature/apps/web/src/features/ai-assist/hooks/useAIFieldUpdates.ts` | Ensure poll covers all sections, not just active |

---

## Step 1 — Verify Cross-Section Architecture

The existing implementation already supports cross-section auto-fill because:

1. **AI extraction is transcript-wide**: `ai-extractor.ts` processes the full transcript and maps facts to ANY field in the form registry, not just the currently viewed section.

2. **Draft values are session-wide**: `AIDraftValue` stores `fieldId` (e.g., `sectionC.milestones`) regardless of what section the therapist is viewing.

3. **Polling is session-wide**: `useAIFieldUpdates` polls `getSession` which returns ALL active draft values for the session.

4. **Form fields are keyed by section**: Field IDs like `sectionA.patientName`, `sectionC.milestones` etc. are used directly — the form's `setValue` knows which section each field belongs to.

---

## Step 2 — Ensure All Sections Are Polled

**File:** `ai-feature/apps/web/src/features/ai-assist/hooks/useAIFieldUpdates.ts` — confirm the poll applies to all sections

The current implementation already does this. Verification:

```typescript
// In useAIFieldUpdates:
const { data: session } = trpc.ai.getSession.useQuery(
  { sessionId: sessionId! },
  {
    enabled: !!sessionId && enabled,
    refetchInterval: pollIntervalMs, // 2 seconds
  }
);

// session.draftValues contains ALL fields across ALL sections
// The for loop processes each draft:
for (const draft of session.draftValues) {
  form.setValue(draft.fieldId, draft.value, { shouldDirty: true });
}
```

---

## Step 3 — Example Flow

```
Therapist opens Section A (Patient & Referral)
Clicks "Start Conversation"

Therapist speaks:
  "The child is named Rahul, he's 4 years old"
  "He has difficulty with loud noises"
  "He started walking at 18 months"

AI extracts and stores drafts:
  - sectionA.patientName: "Rahul" (from "child is named Rahul")
  - sectionA.age.years: 4 (from "he's 4 years old")
  - sectionD.sensoryProfile: [{ systemId: "auditory", rating: 5 }] (from "difficulty with loud noises")
  - sectionC.milestones: [{ milestoneId: "walk", achievedAtMonths: 18 }] (from "started walking at 18 months")

Therapist navigates to Section C (Milestones)
Sees: sectionC already has milestone data pre-filled

Therapist navigates to Section D (Sensory Profile)
Sees: sectionD already has sensory ratings pre-filled

Therapist goes back to Section A
Sees: patient name and age already filled
```

---

## Verification

- [ ] Speak about "developmental milestones" while on Section A → Section C gets pre-filled
- [ ] Speak about "sensory issues" while on Section B → Section D gets pre-filled
- [ ] Navigate to pre-filled section and see values populated
- [ ] Multiple different topics in same conversation populate correct sections
- [ ] `pnpm check-types` passes

## Blocked by

- FE-AI-02 (real-time form updates) — required
