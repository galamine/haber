# FULL-AI-01: AI Documentation — Integration Testing & Polish

## Context

All previous stages (BE-AI-01 through FE-AI-03) are done. This stage covers full end-to-end testing and UI polish.

## Decisions

| Question | Decision |
|---|---|
| Why separate stage? | Isolates testing from development; allows verification at each stage |
| What to test first? | Manual E2E flow before any automated tests |

## Files to Modify

| File | Change |
|---|---|
| `ai-feature/apps/web/src/features/ai-assist/components/RecordingControls.tsx` | Polish UI, error handling |
| `ai-feature/apps/web/src/features/ai-assist/components/ConversationIndicator.tsx` | Improve UX, accessibility |
| `ai-feature/apps/web/src/features/ai-assist/components/AIFieldMonitor.tsx` | Add visual feedback |

---

## Step 1 — End-to-End Test Scenarios

### Scenario 1: Full Conversation Flow
1. Open child profile with `consentStatus: GRANTED`
2. Navigate to `/children/:childId/assessment/new`
3. Click "Start Conversation"
4. Speak in Malayalam: "Patient name is Arjun, date of birth is 15 March 2019, referred by Dr. Nair"
5. Wait 5 seconds
6. Navigate to Section B, C, D — verify fields are pre-filled based on conversation
7. Navigate back to Section A — verify fields are filled
8. Click "Pause" — verify recording pauses
9. Click "Resume" — verify recording resumes
10. Click "End Conversation"
11. Verify form can be submitted with AI-filled data

### Scenario 2: Override Flow
1. Start conversation
2. Speak: "Patient name is Rahul"
3. Wait for field to auto-fill
4. Manually change patient name to "Rohit"
5. Verify override is logged in database
6. Continue speaking — verify "Rohit" is NOT overwritten

### Scenario 3: Cross-Section Filling
1. Start conversation
2. Speak about milestones while on Section A
3. Navigate to Section C — verify milestones are pre-filled
4. Speak about sensory issues while on Section C
5. Navigate to Section D — verify sensory profile is pre-filled

### Scenario 4: Pause/Resume
1. Start conversation
2. Speak for 30 seconds
3. Pause
4. Wait 10 seconds
5. Resume
6. Verify all previous extractions are preserved
7. Speak more
8. Verify new extractions are added to existing

---

## Step 2 — Error Handling

### Sarvam API Failure
```typescript
// In processAudioChunk mutation:
onError: (error) => {
  toast.error("Speech recognition failed. Please check your internet connection.");
  // Continue recording but disable transcription
  setTranscriptionEnabled(false);
}
```

### Microphone Permission Denied
```typescript
// In useAudioRecorder start():
const handleError = (error: Error) => {
  if (error.name === "NotAllowedError") {
    toast.error("Microphone access denied. Please allow microphone access to use AI assist.");
  } else {
    toast.error(`Recording error: ${error.message}`);
  }
};
```

### Session Expired
```typescript
// If getSession returns null after sessionId was set:
if (isSessionNotFound) {
  toast.error("Session expired. Please start a new conversation.");
  onSessionEnd();
}
```

---

## Step 3 — UI Polish

### Recording Button States
- **Idle**: Blue primary button with microphone icon
- **Recording**: Red pulsing indicator + pause button + "End" button
- **Paused**: Yellow "Paused" label + resume button + "End" button
- **Processing**: Disabled buttons with spinner while awaiting transcript

### Conversation Indicator
- Floating pill in top-right corner showing duration
- Expands to show last transcript snippet on hover
- Green checkmark when session is complete

### Field Auto-fill Feedback
- Brief highlight animation when field auto-fills
- Subtle badge showing confidence level (only in debug mode)
- "AI" indicator on fields that were auto-filled

---

## Step 4 — Environment Setup Verification

Verify all environment variables are properly configured:

```bash
# Required in apps/server/.env or packages/env/server:
SARVAM_API_KEY=sk-xxxxx
SARVAM_API_URL=https://api.sarvam.ai
LLM_PROVIDER=openai  # or anthropic
OPENAI_API_KEY=sk-xxxxx  # if using OpenAI
```

Test Sarvam connectivity:
```typescript
const test = async () => {
  const client = new SarvamSTTClient();
  const result = await client.transcribeFile(Buffer.from("test audio"));
  console.log(result);
};
```

Test OpenAI connectivity:
```typescript
const test = async () => {
  const openai = new OpenAI();
  const chat = await openai.chat.completions.create({
    messages: [{ role: "user", content: "Hello" }],
    model: "gpt-4o",
  });
  console.log(chat.choices[0].message.content);
};
```

---

## Step 5 — Database Verification Queries

```sql
-- Check conversation sessions
SELECT * FROM "ConversationSession" ORDER BY "startedAt" DESC LIMIT 10;

-- Check draft values for a session
SELECT * FROM "AIDraftValue" WHERE "sessionId" = 'session-cuid' ORDER BY "createdAt";

-- Check override logs
SELECT * FROM "AIFieldOverride" WHERE "sessionId" = 'session-cuid' ORDER BY "overrideAt";

-- Find sessions with most overrides (AI quality metric)
SELECT "sessionId", COUNT(*) as override_count 
FROM "AIFieldOverride" 
GROUP BY "sessionId" 
ORDER BY override_count DESC;
```

---

## Verification

- [ ] Full conversation in Malayalam successfully transcribes and auto-fills form
- [ ] Pause/resume preserves transcript and drafts
- [ ] Override logging captures all therapist corrections
- [ ] No data loss on page refresh during recording (session persists)
- [ ] Sarvam API key configured and working
- [ ] LLM API key configured and working
- [ ] All environment variables validated at startup
- [ ] Error handling covers all failure scenarios
- [ ] `pnpm check-types` passes
- [ ] `pnpm check` (Biome) passes

## Blocked by

All previous stages must be complete before starting integration testing.
