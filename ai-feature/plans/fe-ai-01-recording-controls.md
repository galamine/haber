# FE-AI-01: AI Documentation — Recording Controls UI

## Context

Stage 4 (BE-AI-04) is done: tRPC procedures are ready. This stage adds the conversation recording controls to the assessment form UI:
- Start/Pause/Resume/Stop buttons
- Recording indicator (visual feedback)
- MediaRecorder integration for audio capture

## Decisions

| Question | Decision |
|---|---|
| Why at form level, not section level? | Conversation recording is per-assessment, not per-section |
| Why base64 for audio? | Simpler tRPC serialization; chunked transfer for streaming |
| Why useRef for MediaRecorder? | Need to persist across renders; MediaRecorder is not serializable |

---

## MediaRecorder Audio Flow

```
Browser MediaRecorder                          Backend
─────────────────────                        ────────

1. navigator.mediaDevices.getUserMedia({ audio: true })
   └─ Returns MediaStream

2. new MediaRecorder(stream, { mimeType: 'audio/webm' })
   └─ MediaRecorder created

3. recorder.start(1000)  ←── fires 'dataavailable' every 1000ms
   └─ Returns audio chunks (Blobs)

4. recorder.ondataavailable = (event) => {
     if (event.data.size > 0) {
       chunks.push(event.data);  ←── accumulate chunks
     }
   }

5. Every 1 second (while recording):
   ├─ Current chunks → Blob → ArrayBuffer → base64
   └─ Send to backend:
      processAudioChunk({
        sessionId: "abc123",
        audioData: "base64...",
        chunkIndex: 42
      })

6. On pause:
   └─ recorder.state = "paused"  (keeps chunks in memory)

7. On resume:
   └─ recorder.state = "inactive" → recorder.start(1000) again
   └─ Continue accumulating chunks

8. On stop:
   └─ recorder.state = "inactive"
   └─ Send final accumulated chunks
   └─ stream.getTracks().forEach(t => t.stop())
```

**Chunk Sending Strategy:**
- Chunks are sent every 1 second while recording
- Each chunk is ~1 second of audio (webm/opus format)
- Chunks are sent asynchronously (fire-and-forget with error handling)
- Final chunk sent on stop to ensure complete transcription

**Error Handling:**
- If chunk fails to send, log error but continue recording
- On error, show toast notification to therapist
- Retry logic for transient failures (network issues)

## Files to Create

| File | Purpose |
|---|---|
| `ai-feature/apps/web/src/features/ai-assist/hooks/useAudioRecorder.ts` | MediaRecorder management hook |
| `ai-feature/apps/web/src/features/ai-assist/components/RecordingControls.tsx` | Start/Pause/Resume/Stop buttons + state |
| `ai-feature/apps/web/src/features/ai-assist/components/ConversationIndicator.tsx` | Recording timer + status display |
| `ai-feature/apps/web/src/features/ai-assist/types.ts` | TypeScript types |
| `ai-feature/apps/web/package.json` | Package manifest |

## Files to Modify

| File | Change |
|---|---|
| `apps/web/src/routes/.../assessment/new.tsx` | Add RecordingControls to form header |
| `apps/web/src/routes/.../followup/new.tsx` | Add RecordingControls to follow-up form |

---

## Step 1 — Audio Recorder Hook

**File:** `ai-feature/apps/web/src/features/ai-assist/hooks/useAudioRecorder.ts` (NEW)

```typescript
import { useState, useRef, useCallback, useEffect } from "react";

type RecorderState = "idle" | "recording" | "paused";

interface UseAudioRecorderOptions {
  sessionId: string | undefined;
  onTranscript: (text: string) => void;
  onChunkSend?: (chunkIndex: number) => void;
  onError: (error: Error) => void;
  onStateChange?: (state: RecorderState) => void;
  onRecordingComplete?: () => void;
  chunkIntervalMs?: number;
  sendChunkIntervalMs?: number;
}

export function useAudioRecorder({
  sessionId,
  onTranscript,
  onChunkSend,
  onError,
  onStateChange,
  onRecordingComplete,
  chunkIntervalMs = 1000,
  sendChunkIntervalMs = 1000,
}: UseAudioRecorderOptions) {
  const [state, setState] = useState<RecorderState>("idle");
  const [chunkIndex, setChunkIndex] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const sendIntervalRef = useRef<number | null>(null);

  const updateState = useCallback((newState: RecorderState) => {
    setState(newState);
    onStateChange?.(newState);
  }, [onStateChange]);

  const sendChunks = useCallback(async () => {
    if (!sessionId || chunksRef.current.length === 0) return;

    const audioBlob = new Blob(chunksRef.current, {
      type: mediaRecorderRef.current?.mimeType ?? "audio/webm",
    });
    const buffer = await audioBlob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

    // Send to backend via processAudioChunk mutation
    // Connection to tRPC happens in parent component via callbacks
    chunksRef.current = [];
    setChunkIndex((prev) => prev + 1);
    onChunkSend?.(chunkIndex);
  }, [sessionId, chunkIndex, onChunkSend]);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4";

      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        sendChunks();
        onRecordingComplete?.();
      };

      recorder.start(chunkIntervalMs);
      updateState("recording");

      sendIntervalRef.current = window.setInterval(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          sendChunks();
        }
      }, sendChunkIntervalMs);
    } catch (err) {
      onError(err instanceof Error ? err : new Error("Failed to start recording"));
    }
  }, [chunkIntervalMs, sendChunkIntervalMs, onError, updateState, sendChunks, onRecordingComplete]);

  const pause = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
      updateState("paused");
    }
  }, [updateState]);

  const resume = useCallback(() => {
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume();
      updateState("recording");
    }
  }, [updateState]);

  const stop = useCallback(() => {
    if (sendIntervalRef.current !== null) {
      clearInterval(sendIntervalRef.current);
      sendIntervalRef.current = null;
    }

    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stop();
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    updateState("idle");
  }, [updateState]);

  useEffect(() => {
    return () => {
      if (sendIntervalRef.current !== null) {
        clearInterval(sendIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return { state, start, pause, resume, stop, chunkIndex };
}
```

---

## Step 2 — Recording Controls Component

**File:** `ai-feature/apps/web/src/features/ai-assist/components/RecordingControls.tsx` (NEW)

```typescript
import { Button } from "@haber-final/ui/components/button";
import { Mic, Pause, Play, Square } from "lucide-react";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { trpc } from "@haber-final/web/utils/trpc";
import type { RecorderState } from "../hooks/useAudioRecorder";

interface RecordingControlsProps {
  assessmentId: string;
  assessmentType: "initial" | "follow-up";
  onTranscript: (text: string) => void;
  sessionId?: string;
  onSessionStart: (sessionId: string) => void;
  onSessionEnd: () => void;
}

export function RecordingControls({
  assessmentId,
  assessmentType,
  onTranscript,
  sessionId,
  onSessionStart,
  onSessionEnd,
}: RecordingControlsProps) {
  const startSessionMutation = trpc.ai.startSession.useMutation({
    onSuccess: (data) => onSessionStart(data.id),
  });
  const pauseSessionMutation = trpc.ai.pauseSession.useMutation();
  const resumeSessionMutation = trpc.ai.resumeSession.useMutation();
  const endSessionMutation = trpc.ai.endSession.useMutation();
  const processChunkMutation = trpc.ai.processAudioChunk.useMutation();

  const handleError = (error: Error) => {
    console.error("Recording error:", error);
  };

  const { state, start, pause, resume, stop } = useAudioRecorder({
    onTranscript,
    onError: handleError,
  });

  const handleStart = async () => {
    if (!sessionId) {
      startSessionMutation.mutate({ assessmentId, assessmentType });
    }
    await start();
  };

  const handlePause = () => {
    pause();
    if (sessionId) {
      pauseSessionMutation.mutate({ sessionId });
    }
  };

  const handleResume = () => {
    resume();
    if (sessionId) {
      resumeSessionMutation.mutate({ sessionId });
    }
  };

  const handleStop = () => {
    stop();
    if (sessionId) {
      endSessionMutation.mutate({ sessionId });
      onSessionEnd();
    }
  };

  return (
    <div className="flex items-center gap-3">
      {state === "idle" && (
        <Button onClick={handleStart} disabled={startSessionMutation.isPending}>
          <Mic className="mr-2 h-4 w-4" />
          Start Conversation
        </Button>
      )}

      {state === "recording" && (
        <>
          <div className="flex items-center gap-2 text-red-600">
            <span className="animate-pulse">●</span>
            <span>Recording</span>
          </div>
          <Button variant="outline" onClick={handlePause}>
            <Pause className="mr-2 h-4 w-4" />
            Pause
          </Button>
        </>
      )}

      {state === "paused" && (
        <>
          <div className="text-muted-foreground">Paused</div>
          <Button variant="outline" onClick={handleResume}>
            <Play className="mr-2 h-4 w-4" />
            Resume
          </Button>
        </>
      )}

      {(state === "recording" || state === "paused") && (
        <Button variant="destructive" onClick={handleStop}>
          <Square className="mr-2 h-4 w-4" />
          End Conversation
        </Button>
      )}
    </div>
  );
}
```

---

## Step 3 — Conversation Indicator

**File:** `ai-feature/apps/web/src/features/ai-assist/components/ConversationIndicator.tsx` (NEW)

```typescript
import { useState, useEffect } from "react";

interface ConversationIndicatorProps {
  isRecording: boolean;
  startedAt: Date | null;
  lastTranscript?: string;
}

export function ConversationIndicator({
  isRecording,
  startedAt,
  lastTranscript,
}: ConversationIndicatorProps) {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!isRecording || !startedAt) {
      setDuration(0);
      return;
    }

    const interval = setInterval(() => {
      setDuration(Math.floor((Date.now() - startedAt.getTime()) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording, startedAt]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isRecording && duration === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 text-sm">
        <span className={isRecording ? "text-red-600" : "text-muted-foreground"}>
          {isRecording ? "Recording" : "Session ended"}
        </span>
        <span className="font-mono text-muted-foreground">
          {formatDuration(duration)}
        </span>
      </div>
      {lastTranscript && (
        <p className="text-xs text-muted-foreground italic truncate">
          "{lastTranscript}"
        </p>
      )}
    </div>
  );
}
```

---

## Step 4 — Types

**File:** `ai-feature/apps/web/src/features/ai-assist/types.ts` (NEW)

```typescript
export interface AIDraftValue {
  id: string;
  sessionId: string;
  fieldId: string;
  value: unknown;
  confidence: "high" | "medium" | "low";
  sourceText: string | null;
  status: "active" | "superseded";
  createdAt: Date;
}

export interface AIFieldOverride {
  id: string;
  sessionId: string;
  fieldId: string;
  aiValue: unknown;
  overrideValue: unknown;
  overrideAt: Date;
}

export interface ConversationSession {
  id: string;
  assessmentId: string;
  assessmentType: "initial" | "follow-up";
  status: "active" | "paused" | "completed";
  startedAt: Date;
  endedAt: Date | null;
  draftValues: AIDraftValue[];
  overrides: AIFieldOverride[];
}

export type RecorderState = "idle" | "recording" | "paused";
```

---

## Step 5 — Package Manifest

**File:** `ai-feature/apps/web/package.json` (NEW)

```json
{
  "name": "@ai-feature/web",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "check-types": "tsc --noEmit"
  },
  "dependencies": {
    "@haber-final/api": "workspace:*",
    "@haber-final/db": "workspace:*",
    "@haber-final/env": "workspace:*",
    "@haber-final/ui": "workspace:*",
    "@tanstack/react-query": "^5.90.12",
    "@trpc/client": "^11.16.0",
    "@trpc/tanstack-react-query": "^11.16.0",
    "lucide-react": "^1.8.0",
    "react": "^19.2.6",
    "react-dom": "^19.2.6",
    "zod": "^4.1.13"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "@vitejs/plugin-react": "^6.0.0",
    "typescript": "^6.0.0",
    "vite": "^8.0.0"
  }
}
```

---

## Verification

- [ ] Start/Pause/Resume/Stop buttons work correctly
- [ ] MediaRecorder captures audio from microphone
- [ ] Audio chunks sent to backend via tRPC
- [ ] Recording state persists across tab navigation
- [ ] UI shows clear recording status with duration timer
- [ ] `pnpm check-types` passes

## Blocked by

- BE-AI-04 (tRPC router) — required
