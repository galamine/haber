# BE-AI-02: AI Documentation — Sarvam STT Integration

## Context

Stage 1 (BE-AI-01) is done: database models and form registry are in place. This stage integrates Sarvam AI's speech-to-text API to convert Malayalam/Indian language audio to text in real-time.

**Sarvam AI Details:**
- Model: `saarika-7b` (Indic language support)
- Languages: `mai` (Malayalam), `ta` (Tamil), `hi` (Hindi), `te` (Telugu), `kn` (Kannada), `mr` (Marathi), `bn` (Bengali), `gu` (Gujarati), `pa` (Punjabi), `or` (Odia)
- Supports streaming for real-time transcription

**Dependencies:**
- Sarvam API key (obtain from Sarvam AI)
- BE-AI-01 schema (recommended but not strictly required)

## Decisions

| Question | Decision |
|---|---|
| Why Sarvam? | Best Indic language STT; 10+ Indian languages including Malayalam |
| Why chunked streaming? | Real-time transcription needed; send 1-second chunks every second |
| Why file-based fallback? | For pause/resume, need non-streaming transcription of accumulated chunks |
| Why base64 encoding? | Simpler tRPC serialization for audio chunks |

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
                                            └─ Send to Sarvam API:
                                               POST /speech-to-text
                                               { audio: "base64...", language: "mai" }
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

## Files to Create

| File | Purpose |
|---|---|
| `ai-feature/packages/api/src/lib/sarvam-stt.ts` | Sarvam API client for streaming and file-based STT |
| `ai-feature/packages/api/src/lib/audio-service.ts` | Audio chunking and format conversion for MediaRecorder |
| `ai-feature/packages/env/server.ts` | Environment variables for Sarvam config |

## Files to Modify

| File | Change |
|---|---|
| `ai-feature/packages/api/package.json` | Add dependencies (jose for auth, etc.) |

---

## Step 1 — Sarvam STT Client

**File:** `ai-feature/packages/api/src/lib/sarvam-stt.ts` (NEW)

```typescript
import { env } from "@ai-feature/env";

interface TranscriptChunk {
  text: string;
  startTime: number;
  endTime: number;
  isFinal: boolean;
}

interface SarvamSTTOptions {
  model?: 'saarika-7b' | 'saarika-7b-v2';
  language?: string; // 'mai', 'ta', 'hi', etc.
}

export class SarvamSTTClient {
  private apiKey: string;
  private model: string;
  private language: string;
  private baseUrl = 'https://api.sarvam.ai';

  constructor(options?: SarvamSTTOptions) {
    this.apiKey = env.SARVAM_API_KEY;
    this.model = options?.model ?? 'saarika-7b';
    this.language = options?.language ?? 'mai'; // Malayalam default
  }

  async transcribeStream(
    audioBuffer: Buffer,
    onTranscript: (chunk: TranscriptChunk) => void
  ): Promise<string> {
    const response = await fetch(`${this.baseUrl}/speech-to-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        audio: audioBuffer.toString('base64'),
        model: this.model,
        language: this.language,
        encoding: 'base64',
        sample_rate: 16000,
        channels: 1,
      }),
    });

    if (!response.ok) {
      throw new Error(`Sarvam STT error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    // Sarvam returns segments with partial/final transcripts
    const fullTranscript = result.text ?? '';
    
    // Simulate streaming callback for each segment
    if (result.segments) {
      for (const segment of result.segments) {
        onTranscript({
          text: segment.text,
          startTime: segment.start,
          endTime: segment.end,
          isFinal: true,
        });
      }
    } else if (result.text) {
      onTranscript({
        text: result.text,
        startTime: 0,
        endTime: 0,
        isFinal: true,
      });
    }

    return fullTranscript;
  }

  async transcribeFile(audioBuffer: Buffer): Promise<TranscriptChunk[]> {
    const response = await fetch(`${this.baseUrl}/speech-to-text/file`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        audio: audioBuffer.toString('base64'),
        model: this.model,
        language: this.language,
        encoding: 'base64',
        sample_rate: 16000,
        channels: 1,
      }),
    });

    if (!response.ok) {
      throw new Error(`Sarvam STT error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    return (result.segments ?? []).map((seg: { text: string; start: number; end: number }) => ({
      text: seg.text,
      startTime: seg.start,
      endTime: seg.end,
      isFinal: true,
    }));
  }
}

export const sarvamSTT = new SarvamSTTClient();
```

---

## Step 2 — Audio Service

**File:** `ai-feature/packages/api/src/lib/audio-service.ts` (NEW)

```typescript
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
  }

  async convertToWav(webmBuffer: Buffer): Promise<Buffer> {
    // MediaRecorder outputs webm/opus, Sarvam expects wav/pcm
    // Use ffmpeg or a pure JS audio converter
    // For Node.js: use 'wav' package to convert
    // This is a placeholder — actual implementation needs audio conversion library
    return webmBuffer; // TODO: implement actual conversion
  }

  async convertToBase64(buffer: Buffer): Promise<string> {
    return buffer.toString('base64');
  }

  validateAudioFormat(mimeType: string): boolean {
    const supported = ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/ogg'];
    return supported.includes(mimeType);
  }
}

export const audioService = new AudioService();
```

---

## Step 3 — Environment Variables

**File:** `ai-feature/packages/env/server.ts` (NEW)

```typescript
import { z } from "zod";

const envSchema = z.object({
  SARVAM_API_KEY: z.string().min(1, "SARVAM_API_KEY is required"),
  SARVAM_API_URL: z.string().url().default("https://api.sarvam.ai"),
  LLM_PROVIDER: z.enum(["openai", "anthropic", "azure"]).default("openai"),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  AZURE_OPENAI_KEY: z.string().optional(),
  AZURE_OPENAI_ENDPOINT: z.string().url().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment variables: ${JSON.stringify(parsed.error.format())}`);
}

export const env = parsed.data;
```

---

## Verification

- [ ] Sarvam API key configured in environment
- [ ] `pnpm check-types` passes
- [ ] Streaming transcription returns Malayalam text correctly
- [ ] Non-streaming file transcription works
- [ ] Handles audio format conversion (MediaRecorder webm → Sarvam format)
- [ ] Language parameter correctly switches between supported languages

## Blocked by

- BE-AI-01 (foundation schema) — recommended but not strictly required
- Sarvam API key — required before testing
