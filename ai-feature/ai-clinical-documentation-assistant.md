# AI Clinical Documentation Assistant — Implementation Plan

## Context

This plan adds an AI Clinical Documentation Assistant to the Haber application. The feature listens to therapist-patient consultations (in Malayalam/Indian languages via Sarvam STT), extracts structured facts in real-time, maps them to form fields across ALL sections, and auto-fills the form as the conversation progresses.

**Key decisions (confirmed):**
- **STT Provider:** Sarvam AI (Indic language support — Malayalam, Hindi, Tamil, etc.)
- **Recording scope:** Conversation-level (form-level), can pause/resume multiple times per assessment
- **Auto-fill:** Real-time, fields update AS therapist speaks
- **Override:** Therapist can edit any field during recording; edits are logged
- **Cross-section filling:** AI maps facts to appropriate sections regardless of which section therapist is viewing
- **Implementation location:** Self-contained module in `ai-feature/` directory

**Existing work to leverage:**
- Assessment form schemas in `packages/api/src/schemas/assessment.ts`
- Assessment routers in `packages/api/src/routers/assessment.ts`
- Assessment UI components in `apps/web/src/features/assessment/`
- InitialAssessment and FollowUpAssessment Prisma models

**Scope:** Both Initial Assessment (8 sections A–H) and Follow-up Assessment (6 sections A–F)

---

## Decisions

| Question | Decision |
|---|---|
| Why Sarvam for STT? | Best Indic language STT; 10+ Indian languages including Malayalam |
| Why in-application agent? | More reliable than UI automation; works with existing schemas |
| Why tRPC router? | Type-safe, consistent with existing API patterns |
| Why draft storage separate? | Clean separation between extracted and approved data |
| Why override logging? | Audit trail of therapist corrections; AI quality tracking |
| Why self-contained module? | Isolated development, easy to integrate/remove without affecting core app |

---

## Architecture

```
[Microphone] → [MediaRecorder API] → [Sarvam STT Streaming] → [AI Extractor]
                                                                       ↓
                                                          [Map Transcript → Form Fields]
                                                                       ↓
                                                               [Store Draft Values]
                                                                       ↓
                                                             [tRPC Query Polling]
                                                                       ↓
                                                        [Form fields update live]
```

---

## Flow

**1. Therapist opens an assessment form** (Initial or Follow-up)

**2. Clicks "Start Conversation"**
- Recording begins (single session, but can be paused/stopped)
- Sarvam STT streams text in real-time (Malayalam/Hindi/etc. → text)
- AI extracts facts and maps them to form fields

**3. Form auto-fills AS they speak**
- Therapist can navigate to any section — AI has already populated fields based on conversation
- Therapist can OVERRIDE any field while recording
- Override is logged for audit/quality tracking

**4. Therapist finishes, clicks "End Conversation"**
- Recording stops, session marked complete
- All sections have data (AI-filled + manual overrides)
- Form ready for therapist review and submission

---

## Files to Create

| File | Purpose |
|---|---|
| `ai-feature/packages/db/prisma/schema/ai.prisma` | AI models: ConversationSession, AIDraftValue, AIFieldOverride |
| `ai-feature/packages/api/src/lib/sarvam-stt.ts` | Sarvam API client for streaming STT |
| `ai-feature/packages/api/src/lib/audio-service.ts` | Audio chunking and format conversion |
| `ai-feature/packages/api/src/lib/ai-extractor.ts` | AI fact extraction and field mapping logic |
| `ai-feature/packages/api/src/lib/ai-provider.ts` | LLM provider abstraction (OpenAI/Anthropic) |
| `ai-feature/packages/api/src/routers/ai.ts` | AI tRPC procedures |
| `ai-feature/packages/api/src/schemas/form-registry.ts` | Registry exposing all form fields with AI metadata |
| `ai-feature/packages/api/src/schemas/ai.ts` | Zod schemas for AI request/response |
| `ai-feature/packages/api/src/index.ts` | Package exports |
| `ai-feature/packages/db/package.json` | Package manifest |
| `ai-feature/packages/api/package.json` | Package manifest |
| `ai-feature/apps/web/src/features/ai-assist/components/RecordingControls.tsx` | Start/Pause/Resume/Stop UI |
| `ai-feature/apps/web/src/features/ai-assist/components/ConversationIndicator.tsx` | Recording timer + status |
| `ai-feature/apps/web/src/features/ai-assist/components/AIFieldMonitor.tsx` | Field change detection |
| `ai-feature/apps/web/src/features/ai-assist/hooks/useAudioRecorder.ts` | MediaRecorder hook |
| `ai-feature/apps/web/src/features/ai-assist/hooks/useAIFieldUpdates.ts` | Draft polling + form sync |
| `ai-feature/apps/web/src/features/ai-assist/types.ts` | TypeScript types |
| `ai-feature/apps/web/package.json` | Package manifest |

---

## Implementation Stages

| Stage | Plan | Description | Dependencies |
|---|---|---|---|
| **Stage 1** | `be-ai-01` | Foundation: Database & Schema Registry | None |
| **Stage 2** | `be-ai-02` | Sarvam STT Integration | Stage 1 |
| **Stage 3** | `be-ai-03` | AI Extraction Service | Stage 2 |
| **Stage 4** | `be-ai-04` | tRPC Router | Stage 1, Stage 3 |
| **Stage 5** | `fe-ai-01` | Frontend: Recording Controls | Stage 4 |
| **Stage 6** | `fe-ai-02` | Frontend: Real-time Form Updates | Stage 5 |
| **Stage 7** | `fe-ai-03` | Frontend: Cross-Section Auto-fill | Stage 6 |
| **Stage 8** | `full-ai-01` | Integration Testing & Polish | All above |

---

## Environment Variables Needed

**`apps/server/.env` / `packages/env/server`:**
```
SARVAM_API_KEY=        # Sarvam AI API key
SARVAM_API_URL=        # Sarvam API base URL (default: https://api.sarvam.ai)
LLM_PROVIDER=          # openai | anthropic | azure
OPENAI_API_KEY=        # If using OpenAI
ANTHROPIC_API_KEY=     # If using Anthropic
AZURE_OPENAI_KEY=      # If using Azure
```

---

## Blocked By

- **Sarvam API key** — needed before Stage 2 (be-ai-02) testing
- **LLM Provider decision** (OpenAI/Anthropic/Azure) — needed before Stage 3 (be-ai-03) implementation
