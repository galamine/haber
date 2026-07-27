# BE-AI-04: AI Documentation — tRPC Router

## Context

Stage 3 (BE-AI-03) is done: AI extraction service is working. This stage creates the tRPC procedures that:
1. Manage conversation sessions (start/pause/resume/end)
2. Process audio chunks and store draft values
3. Log therapist overrides
4. Serve form schemas to frontend

## Decisions

| Question | Decision |
|---|---|
| Why session management in tRPC? | Type-safe, consistent with existing API patterns |
| Why protected procedures only? | Patient data must never be accessible without auth |
| Why store overrides separately? | Audit trail + AI quality improvement tracking |
| Why use existing Prisma client? | Avoids duplicate DB connections; reuses @haber-final/db |

---

## Audio Chunk Processing Flow

```
Frontend sends every 1 second:     Backend processes:
─────────────────────────────     ─────────────────

processAudioChunk({              1. Decode base64 → Buffer
  sessionId: "abc",               2. Send to Sarvam STT
  audioData: "base64...",    →   3. Get transcript text
  chunkIndex: 42                  4. Append to transcript history
})                                 5. Run AI extraction on full history
                                   6. Store/update AIDraftValue rows
                                   7. Return { drafts: [...] }
                                   ← ───────────────────────────

Frontend polls every 2 seconds:
─────────────────────────────
getSession({ sessionId })    →   Returns all draftValues + overrides
← ────────────────────────────
```

**Transcript History Strategy:**
- Each `processAudioChunk` call receives 1 second of audio
- Backend maintains transcript history by concatenating results
- When AI extracts facts, it uses the FULL transcript history (not just latest chunk)
- This allows AI to understand context ("he" refers to the child mentioned earlier)

**Pause/Resume Buffering:**
| Event | Behavior |
|-------|----------|
| **Pause** | Frontend stops sending chunks; transcript history preserved in DB |
| **Resume** | Frontend starts sending chunks again; backend appends to existing transcript |
| **Stop** | Final extraction pass on complete transcript; session marked "completed" |

**processAudioChunk Schema (updated):**
```typescript
export const ProcessAudioChunkInput = z.object({
  sessionId: z.string(),
  audioData: z.string(), // base64 encoded audio chunk (1 second of webm)
  chunkIndex: z.number().int().min(0), // for ordering/debugging
});
```

## Files to Create

| File | Purpose |
|---|---|
| `ai-feature/packages/api/src/routers/ai.ts` | AI tRPC procedures |
| `ai-feature/packages/api/src/schemas/ai.ts` | Zod schemas for AI request/response |
| `ai-feature/packages/api/src/index.ts` | Package exports |
| `ai-feature/packages/api/package.json` | Package manifest |

## Files to Modify

| File | Change |
|---|---|
| `packages/api/src/routers/index.ts` | Merge `aiRouter` from @ai-feature/api |

---

## Step 1 — AI Schemas

**File:** `ai-feature/packages/api/src/schemas/ai.ts` (NEW)

```typescript
import { z } from "zod";

export const StartSessionInput = z.object({
  assessmentId: z.string(),
  assessmentType: z.enum(['initial', 'follow-up']),
});

export const SessionIdInput = z.object({
  sessionId: z.string(),
});

export const ProcessAudioChunkInput = z.object({
  sessionId: z.string(),
  audioData: z.string(), // base64 encoded audio chunk (1 second of webm)
  chunkIndex: z.number().int().min(0), // for ordering/debugging
});

export const LogOverrideInput = z.object({
  sessionId: z.string(),
  fieldId: z.string(),
  aiValue: z.unknown(),
  overrideValue: z.unknown(),
});

export const GetFormSchemaInput = z.object({
  assessmentType: z.enum(['initial', 'follow-up']),
});

export const AIDraftValueSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  fieldId: z.string(),
  value: z.unknown(),
  confidence: z.enum(['high', 'medium', 'low']),
  sourceText: z.string().nullable(),
  status: z.enum(['active', 'superseded']),
  createdAt: z.date(),
});

export const AIFieldOverrideSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  fieldId: z.string(),
  aiValue: z.unknown(),
  overrideValue: z.unknown(),
  overrideAt: z.date(),
});

export const ConversationSessionSchema = z.object({
  id: z.string(),
  assessmentId: z.string(),
  assessmentType: z.enum(['initial', 'follow-up']),
  status: z.enum(['active', 'paused', 'completed']),
  startedAt: z.date(),
  endedAt: z.date().nullable(),
  draftValues: z.array(AIDraftValueSchema),
  overrides: z.array(AIFieldOverrideSchema),
});
```

---

## Step 2 — AI Router

**File:** `ai-feature/packages/api/src/routers/ai.ts` (NEW)

```typescript
import { z } from "zod";
import { protectedProcedure, router } from "@haber-final/api/src/index";
import { aiExtractor } from "../lib/ai-extractor";
import { sarvamSTT } from "../lib/sarvam-stt";
import prisma from "@haber-final/db";
import {
  StartSessionInput,
  SessionIdInput,
  ProcessAudioChunkInput,
  LogOverrideInput,
  GetFormSchemaInput,
} from "../schemas/ai";
import { formRegistry } from "../schemas/form-registry";

// Transcript history is stored in the ConversationSession model
// We use a JSON field to accumulate transcript over time

async function getTranscriptHistory(sessionId: string): Promise<string | null> {
  const session = await prisma.conversationSession.findUnique({
    where: { id: sessionId },
    select: { transcriptHistory: true },
  });
  return session?.transcriptHistory as string | null;
}

async function saveTranscriptHistory(sessionId: string, transcript: string): Promise<void> {
  await prisma.conversationSession.update({
    where: { id: sessionId },
    data: { transcriptHistory: transcript },
  });
}

export const aiRouter = router({
  startSession: protectedProcedure
    .input(StartSessionInput)
    .mutation(async ({ input }) => {
      return prisma.conversationSession.create({
        data: {
          assessmentId: input.assessmentId,
          assessmentType: input.assessmentType,
        },
      });
    }),

  pauseSession: protectedProcedure
    .input(SessionIdInput)
    .mutation(async ({ input }) => {
      return prisma.conversationSession.update({
        where: { id: input.sessionId },
        data: { status: "paused" },
      });
    }),

  resumeSession: protectedProcedure
    .input(SessionIdInput)
    .mutation(async ({ input }) => {
      return prisma.conversationSession.update({
        where: { id: input.sessionId },
        data: { status: "active" },
      });
    }),

  endSession: protectedProcedure
    .input(SessionIdInput)
    .mutation(async ({ input }) => {
      return prisma.conversationSession.update({
        where: { id: input.sessionId },
        data: { status: "completed", endedAt: new Date() },
      });
    }),

  getSession: protectedProcedure
    .input(SessionIdInput)
    .query(async ({ input }) => {
      return prisma.conversationSession.findUnique({
        where: { id: input.sessionId },
        include: {
          draftValues: { where: { status: "active" } },
          overrides: { orderBy: { overrideAt: "desc" } },
        },
      });
    }),

  getFormSchema: protectedProcedure
    .input(GetFormSchemaInput)
    .query(async ({ input }) => {
      return input.assessmentType === "initial"
        ? formRegistry.initialAssessment
        : formRegistry.followUpAssessment;
    }),

  processAudioChunk: protectedProcedure
    .input(ProcessAudioChunkInput)
    .mutation(async ({ input }) => {
      const session = await prisma.conversationSession.findUnique({
        where: { id: input.sessionId },
      });
      if (!session) throw new Error("Session not found");
      if (session.status !== "active") return { drafts: [] };

      // Step 1: Decode base64 audio → Buffer
      const audioBuffer = Buffer.from(input.audioData, "base64");

      // Step 2: Send to Sarvam STT → get transcript text
      const transcriptText = await sarvamSTT.transcribeStream(audioBuffer);

      // Step 3: Get existing transcript history from session metadata
      // (We store accumulated transcript in a separate table or session metadata)
      const existingTranscript = await getTranscriptHistory(input.sessionId);
      const fullTranscript = existingTranscript
        ? `${existingTranscript} ${transcriptText}`
        : transcriptText;

      // Step 4: Save updated transcript history
      await saveTranscriptHistory(input.sessionId, fullTranscript);

      // Step 5: Get child info for context
      const child = await prisma.child.findFirst({
        where: {
          OR: [
            { id: session.assessmentType === "initial"
              ? (await prisma.initialAssessment.findFirst({ where: { id: session.assessmentId } }))?.childId
              : (await prisma.followUpAssessment.findFirst({ where: { id: session.assessmentId } }))?.childId
            }
          ]
        },
        select: { fullName: true },
      });

      // Step 6: Extract facts from FULL transcript (not just latest chunk)
      const facts = await aiExtractor.extractFacts(
        fullTranscript,
        session.assessmentType as "initial" | "follow-up",
        { childName: child?.fullName }
      );

      // Step 7: Map to fields
      const existingDrafts = await prisma.aIDraftValue.findMany({
        where: { sessionId: input.sessionId, status: "active" },
      });
      const existingValues: Record<string, unknown> = {};
      for (const draft of existingDrafts) {
        existingValues[draft.fieldId] = draft.value;
      }

      const fieldMap = aiExtractor.mapToFields(facts, existingValues);

      // Step 8: Store/update draft values
      const storedDrafts = [];
      for (const [fieldId, fact] of fieldMap.entries()) {
        const existingDraft = existingDrafts.find((d) => d.fieldId === fieldId);

        if (existingDraft) {
          // Mark old as superseded
          await prisma.aIDraftValue.update({
            where: { id: existingDraft.id },
            data: { status: "superseded" },
          });
        }

        const newDraft = await prisma.aIDraftValue.create({
          data: {
            sessionId: input.sessionId,
            fieldId,
            value: fact.value as object,
            confidence: fact.confidence,
            sourceText: fact.sourceText,
          },
        });
        storedDrafts.push(newDraft);
      }

      return { drafts: storedDrafts, transcriptSoFar: fullTranscript };
    }),

  logOverride: protectedProcedure
    .input(LogOverrideInput)
    .mutation(async ({ input }) => {
      return prisma.aIFieldOverride.create({
        data: {
          sessionId: input.sessionId,
          fieldId: input.fieldId,
          aiValue: input.aiValue as object,
          overrideValue: input.overrideValue as object,
        },
      });
    }),
});
```

---

## Step 3 — Package Index

**File:** `ai-feature/packages/api/src/index.ts` (NEW)

```typescript
export { aiRouter } from "./routers/ai";
export * from "./schemas/ai";
export { formRegistry } from "./schemas/form-registry";
export { aiExtractor } from "./lib/ai-extractor";
export { sarvamSTT } from "./lib/sarvam-stt";
```

---

## Step 4 — Package Manifest

**File:** `ai-feature/packages/api/package.json` (NEW)

```json
{
  "name": "@ai-feature/api",
  "type": "module",
  "exports": {
    ".": {
      "default": "./src/index.ts"
    },
    "./package.json": "./package.json"
  },
  "scripts": {},
  "dependencies": {
    "@anthropic-ai/sdk": "^0.52.0",
    "@haber-final/api": "workspace:*",
    "@haber-final/db": "workspace:*",
    "@trpc/client": "^11.16.0",
    "@trpc/server": "^11.16.0",
    "dotenv": "^17.2.2",
    "openai": "^4.77.0",
    "zod": "^4.1.13"
  },
  "devDependencies": {
    "typescript": "^6.0.0"
  }
}
```

---

## Step 5 — Integration with Main App

**File:** `packages/api/src/routers/index.ts` — add import and merge

```typescript
// Add to existing imports
import { aiRouter } from "@ai-feature/api";

// Add to appRouter
export const appRouter = router({
  // ... existing routers
  ai: aiRouter,
});
```

---

## Verification

- [ ] All procedures require authentication (protected)
- [ ] Session CRUD operations work correctly
- [ ] Override logging persists to database
- [ ] Audio chunk processing extracts and stores facts
- [ ] Types flow correctly to frontend client
- [ ] `pnpm check-types` passes

## Blocked by

- BE-AI-01 (foundation schema) — required (needs Prisma models)
- BE-AI-03 (AI extraction) — required
