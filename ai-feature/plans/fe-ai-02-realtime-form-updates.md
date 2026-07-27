# FE-AI-02: AI Documentation — Real-time Form Updates

## Context

Stage 5 (FE-AI-01) is done: Recording controls are working. This stage makes form fields auto-populate as AI extracts facts from the conversation:
- Poll for draft values every 2 seconds
- Apply drafts to form fields (only for empty or previously AI-filled fields)
- Detect and log manual overrides

## Decisions

| Question | Decision |
|---|---|
| Why polling instead of WebSocket? | Simpler implementation; tRPC doesn't have built-in subscriptions |
| Why 2-second interval? | Balance between responsiveness and server load |
| Why not overwrite manual edits? | Therapist corrections must be preserved |
| Why track manuallyEditedFields? | Need to know which fields to protect from AI overwrites |

## Files to Create

| File | Purpose |
|---|---|
| `ai-feature/apps/web/src/features/ai-assist/hooks/useAIFieldUpdates.ts` | Polling hook for draft values + form sync |

## Files to Modify

| File | Change |
|---|---|
| `ai-feature/apps/web/src/features/ai-assist/components/AIFieldMonitor.tsx` | Field change detection + override logging |
| `ai-feature/apps/web/src/features/ai-assist/components/RecordingControls.tsx` | Integrate field updates |

---

## Step 1 — AI Field Updates Hook

**File:** `ai-feature/apps/web/src/features/ai-assist/hooks/useAIFieldUpdates.ts` (NEW)

```typescript
import { useState, useEffect, useCallback, useRef } from "react";
import { trpc } from "@haber-final/web/utils/trpc";
import type { AIDraftValue } from "../types";

interface UseAIFieldUpdatesOptions {
  sessionId: string | undefined;
  form: {
    getValues: (path: string) => unknown;
    setValue: (path: string, value: unknown, options?: { shouldDirty?: boolean }) => void;
    getFieldState: (path: string) => { isDirty: boolean; isTouched: boolean };
  };
  enabled?: boolean;
  pollIntervalMs?: number;
}

export function useAIFieldUpdates({
  sessionId,
  form,
  enabled = true,
  pollIntervalMs = 2000,
}: UseAIFieldUpdatesOptions) {
  const [manuallyEditedFields, setManuallyEditedFields] = useState<Set<string>>(new Set());
  const previousValuesRef = useRef<Record<string, unknown>>({});

  const { data: session, isLoading } = trpc.ai.getSession.useQuery(
    { sessionId: sessionId! },
    {
      enabled: !!sessionId && enabled,
      refetchInterval: pollIntervalMs,
    }
  );

  // Apply draft values to form
  useEffect(() => {
    if (!session?.draftValues) return;

    for (const draft of session.draftValues) {
      const fieldState = form.getFieldState(draft.fieldId);
      
      // Skip if field was manually edited by therapist
      if (manuallyEditedFields.has(draft.fieldId)) continue;
      
      // Skip if field is already filled with a different non-empty value
      const currentValue = form.getValues(draft.fieldId);
      const previousValue = previousValuesRef.current[draft.fieldId];
      
      if (currentValue !== undefined && currentValue !== "" && currentValue !== null) {
        // Field has a value - only update if it was previously AI-set
        if (previousValue === undefined) continue;
      }

      // Apply the AI draft value
      form.setValue(draft.fieldId, draft.value, { shouldDirty: true });
    }

    // Update previous values reference
    for (const draft of session.draftValues) {
      previousValuesRef.current[draft.fieldId] = draft.value;
    }
  }, [session, form, manuallyEditedFields]);

  // Detect manual overrides
  const handleFieldChange = useCallback(
    (fieldId: string, newValue: unknown) => {
      if (!sessionId) return;

      const previousValue = previousValuesRef.current[fieldId];
      const originalAIValue = session?.draftValues?.find((d) => d.fieldId === fieldId)?.value;

      // Check if this is an override
      if (previousValue !== undefined && newValue !== previousValue && originalAIValue !== undefined) {
        trpc.ai.logOverride.useMutation().mutate({
          sessionId,
          fieldId,
          aiValue: originalAIValue,
          overrideValue: newValue,
        });

        // Mark field as manually edited - AI won't overwrite it again
        setManuallyEditedFields((prev) => new Set([...prev, fieldId]));
      }

      // Update reference
      previousValuesRef.current[fieldId] = newValue;
    },
    [sessionId, session?.draftValues]
  );

  const resetOverrideTracking = useCallback((fieldId: string) => {
    setManuallyEditedFields((prev) => {
      const next = new Set(prev);
      next.delete(fieldId);
      return next;
    });
  }, []);

  return {
    isLoading,
    handleFieldChange,
    resetOverrideTracking,
    manuallyEditedFields,
  };
}
```

---

## Step 2 — AI Field Monitor Component

**File:** `ai-feature/apps/web/src/features/ai-assist/components/AIFieldMonitor.tsx` (NEW)

```typescript
import { useEffect, useRef } from "react";
import { useAIFieldUpdates } from "../hooks/useAIFieldUpdates";

interface AIFieldMonitorProps {
  sessionId: string | undefined;
  form: {
    getValues: (path: string) => unknown;
    setValue: (path: string, value: unknown, options?: { shouldDirty?: boolean }) => void;
    getFieldState: (path: string) => { isDirty: boolean; isTouched: boolean };
  };
  sectionId: string;
}

export function AIFieldMonitor({ sessionId, form, sectionId }: AIFieldMonitorProps) {
  const { handleFieldChange, isLoading } = useAIFieldUpdates({
    sessionId,
    form,
  });

  // Section-specific monitoring could be added here
  // For now, monitoring is global

  if (!sessionId) return null;

  return (
    <div className="sr-only" aria-live="polite">
      {isLoading && <span>Updating form from conversation...</span>}
    </div>
  );
}
```

---

## Step 3 — Integration with RecordingControls

**File:** `ai-feature/apps/web/src/features/ai-assist/components/RecordingControls.tsx` — update to include field updates

Add to the RecordingControls component:

```typescript
// Add after state declarations
const formRef = useRef(form);
formRef.current = form;

const { handleFieldChange } = useAIFieldUpdates({
  sessionId: activeSessionId,
  form,
  enabled: state === "recording" || state === "paused",
});

// When transcript comes in from Sarvam, process it
useEffect(() => {
  if (!transcript || !activeSessionId) return;
  
  processChunkMutation.mutate({
    sessionId: activeSessionId,
    audioData: "", // empty for text-only input
    transcript,
  });
}, [transcript, activeSessionId]);
```

---

## Verification

- [ ] Form fields update within 3 seconds of AI extraction
- [ ] Manual edits are not overwritten by AI
- [ ] Override events logged to database
- [ ] Works across all 8 sections (not just active section)
- [ ] `pnpm check-types` passes

## Blocked by

- FE-AI-01 (recording controls) — required
