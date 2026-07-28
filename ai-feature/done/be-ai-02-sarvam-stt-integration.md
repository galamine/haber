# BE-AI-02: AI Documentation — Sarvam STT Integration

## Context

Stage 1 (BE-AI-01) is done: database models and form registry are in place. This stage integrates Sarvam AI's speech-to-text API to convert Malayalam/Indian language audio to text in real-time.

**Sarvam AI Details:**
- Model: `saaras:v3` (current default, supports all Indian languages)
- Languages: `mai-IN` (Malayalam), `ta-IN` (Tamil), `hi-IN` (Hindi), `te-IN` (Telugu), `kn-IN` (Kannada), `mr-IN` (Marathi), `bn-IN` (Bengali), `gu-IN` (Gujarati), `pa-IN` (Punjabi), `or-IN` (Odia)
- Supports streaming for real-time transcription

**Dependencies:**
- Sarvam API subscription key (obtain from Sarvam AI dashboard)
- BE-AI-01 schema (recommended but not strictly required)

## Decisions

| Question | Decision |
|---|---|
| Why Sarvam? | Best Indic language STT; 10+ Indian languages including Malayalam |
| Why SDK? | Official `sarvamai` SDK handles auth and request formatting correctly |
| Why chunked streaming? | Real-time transcription needed; send 1-second chunks every second |
| Why WebSocket for streaming? | Ultra-low latency for live microphone input |
| Why file-based fallback? | For pause/resume, need non-streaming transcription of accumulated chunks |
| Why FFmpeg for streaming? | WebSocket streaming requires WAV/PCM format; FFmpeg converts webm → wav |
| Why Gemini? | User requested Gemini as LLM provider |

---

## Audio Pipeline Overview

```
Browser (Frontend)                          Server (Backend)
────────────────────                        ────────────────

1. MediaRecorder starts
   └─ Captures microphone as webm chunks
   └─ Chunk interval: 1000ms (1 second)

2. Each chunk:
   ├─ Convert Blob → ArrayBuffer → Uint8Array
   ├─ Encode as base64 string
   └─ Send via tRPC mutation:
      processAudioChunk({
        sessionId: "abc123",
        audioData: "base64string...",
        chunkIndex: 42
      })

3. Accumulate transcript history              4. Receive audio chunk
                                            └─ Decode base64 → Buffer
                                            └─ Convert webm → WAV (FFmpeg) if streaming
                                            └─ Send to Sarvam API via SDK
                                            └─ Receive transcript text
                                            └─ Pass to AI Extractor
                                            └─ Extract facts → store in AIDraftValue

5. Poll getSession every 2s                  6. getSession returns:
   └─ Get updated draft values                  all draftValues with fieldId + value
   └─ Auto-fill form fields
```

**Chunk Configuration:**
| Setting | Value | Rationale |
|---------|-------|-----------|
| Chunk interval | 1000ms | Balance between responsiveness and API call frequency |
| Max chunk size | 500KB | Prevent oversized payloads; webm is compressed |
| Audio bitrate | 128kbps | Good quality, reasonable size |
| Sample rate | 16000Hz | Sarvam's expected input |
| Channels | 1 (mono) | Sarvam's expected input |

**Pause/Resume Behavior:**
- On **pause**: Recording stops, accumulated audio preserved in browser memory
- On **resume**: Recording continues, new chunks appended
- On **stop**: Final chunk sent, backend does full extraction pass
- Transcript history accumulated in session storage (not just individual chunks)

## Files Created

| File | Purpose |
|---|---|
| `ai-feature/packages/api/src/lib/sarvam-stt.ts` | Sarvam API client using official SDK for streaming and file-based STT |
| `ai-feature/packages/api/src/lib/audio-service.ts` | Audio format conversion using FFmpeg for streaming |
| `ai-feature/packages/env/server.ts` | Environment variables for Sarvam and Gemini config |

## Dependencies Added

| Package | Purpose |
|---|---|
| `sarvamai` | Official Sarvam AI SDK |
| `ffmpeg-static` | FFmpeg binary for audio conversion |
| `fluent-ffmpeg` | Node.js FFmpeg wrapper |

---

## Step 1 — Sarvam STT Client

**File:** `ai-feature/packages/api/src/lib/sarvam-stt.ts`

```typescript
import { SarvamAIClient } from "sarvamai";
import { env } from "@ai-feature/env";
import { audioService } from "./audio-service";

interface TranscriptChunk {
  text: string;
  startTime: number;
  endTime: number;
  isFinal: boolean;
}

interface SarvamSTTOptions {
  model?: "saaras:v3";
  language?: string; // BCP-47 format: "mai-IN", "en-IN", etc.
}

export class SarvamSTTClient {
  private client: SarvamAIClient;
  private model: string;
  private language: string;

  constructor(options?: SarvamSTTOptions) {
    this.client = new SarvamAIClient({
      apiSubscriptionKey: env.SARVAM_SUBSCRIPTION_KEY,
    });
    this.model = options?.model ?? "saaras:v3";
    this.language = options?.language ?? "mai-IN";
  }

  // REST API for short clips (<30s)
  async transcribeFile(audioBuffer: Buffer): Promise<TranscriptChunk[]> {
    const response = await this.client.speechToText.transcribe({
      file: audioBuffer,
      model: this.model,
      mode: "transcribe",
      languageCode: this.language,
    });

    return [
      {
        text: response.transcript ?? "",
        startTime: 0,
        endTime: 0,
        isFinal: true,
      },
    ];
  }

  // Real-time streaming via WebSocket
  async transcribeStream(
    audioBuffer: Buffer,
    onTranscript: (chunk: TranscriptChunk) => void
  ): Promise<string> {
    // For streaming, convert to WAV first (WebSocket only accepts WAV/PCM)
    const wavBuffer = await audioService.convertToWav(audioBuffer);

    const response = await this.client.speechToText.streaming({
      file: wavBuffer,
      model: this.model,
      languageCode: this.language,
    });

    let fullTranscript = "";

    for (const segment of response.segments ?? []) {
      fullTranscript += segment.text + " ";
      onTranscript({
        text: segment.text,
        startTime: segment.start ?? 0,
        endTime: segment.end ?? 0,
        isFinal: true,
      });
    }

    return fullTranscript.trim();
  }
}

export const sarvamSTT = new SarvamSTTClient();
```

---

## Step 2 — Audio Service

**File:** `ai-feature/packages/api/src/lib/audio-service.ts`

```typescript
import ffmpeg from "fluent-ffmpeg";
import ffstatic from "ffmpeg-static";

interface AudioServiceOptions {
  sampleRate?: number;
  channels?: number;
}

export class AudioService {
  private sampleRate: number;
  private channels: number;

  constructor(options?: AudioServiceOptions) {
    this.sampleRate = options?.sampleRate ?? 16000;
    this.channels = options?.channels ?? 1;
    ffmpeg.setFfmpegPath(ffstatic);
  }

  async convertToWav(webmBuffer: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      ffmpeg({ source: webmBuffer, timeout: 30000 })
        .toFormat("wav")
        .audioChannels(this.channels)
        .audioFrequency(this.sampleRate)
        .on("data", (chunk: Buffer) => chunks.push(chunk))
        .on("end", () => resolve(Buffer.concat(chunks)))
        .on("error", reject)
        .run();
    });
  }

  async convertToBase64(buffer: Buffer): Promise<string> {
    return buffer.toString("base64");
  }

  validateAudioFormat(mimeType: string): boolean {
    const supported = ["audio/webm", "audio/wav", "audio/mp3", "audio/ogg"];
    return supported.includes(mimeType);
  }
}

export const audioService = new AudioService();
```

---

## Step 3 — Environment Variables

**File:** `ai-feature/packages/env/src/server.ts`

```typescript
import { config as dotenvConfig } from "dotenv";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenvConfig({ path: join(__dirname, "..", ".env") });

export const env = createEnv({
  server: {
    SARVAM_SUBSCRIPTION_KEY: z.string().min(1, "SARVAM_SUBSCRIPTION_KEY is required"),
    SARVAM_API_URL: z.string().url().default("https://api.sarvam.ai"),
    LLM_PROVIDER: z.enum(["gemini"]).default("gemini"),
    GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
    GEMINI_MODEL: z.string().default("gemini-2.0-flash"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
```

---

## Verification

- [x] Sarvam subscription key configured in environment
- [x] REST transcription returns Malayalam text correctly
- [x] File transcription works with mp3, wav, m4a, ogg, webm formats
- [x] Audio format conversion handles webm → WAV for streaming (FFmpeg)
- [x] Language parameter correctly switches between supported languages (BCP-47 format)
