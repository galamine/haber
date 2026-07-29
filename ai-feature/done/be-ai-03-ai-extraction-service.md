# BE-AI-03: AI Documentation — AI Extraction Service

## Context

Stage 2 (BE-AI-02) is done: Sarvam STT integration is working. This stage builds the AI logic that:
1. Takes transcribed text and extracts structured facts
2. Maps those facts to form fields using the form registry

**LLM Provider decision needed:** OpenAI GPT-4 / Anthropic Claude / Azure OpenAI

## Decisions

| Question | Decision |
|---|---|
| Why separate extraction from STT? | STT is language-specific; extraction is LLM-specific — swapping either doesn't affect the other |
| Why confidence scores? | Allows UI to show "high/medium/low" trust indicators |
| Why source text tracking? | Enables audit trail and therapist review of AI reasoning |
| Why prompt-based extraction? | More flexible than fine-tuned model; can add fields without retraining |

## Files to Create

| File | Purpose |
|---|---|
| `ai-feature/packages/api/src/lib/ai-provider.ts` | LLM provider abstraction (OpenAI/Anthropic/Azure) |
| `ai-feature/packages/api/src/lib/ai-extractor.ts` | AI fact extraction and field mapping logic |
| `ai-feature/packages/api/src/lib/openai-provider.ts` | OpenAI implementation of AIProvider |
| `ai-feature/packages/api/src/lib/anthropic-provider.ts` | Anthropic implementation of AIProvider |

## Files to Modify

| File | Change |
|---|---|
| `ai-feature/packages/api/package.json` | Add OpenAI/Anthropic SDK dependencies |

---

## Step 1 — AI Provider Interface

**File:** `ai-feature/packages/api/src/lib/ai-provider.ts` (NEW)

```typescript
export interface ExtractedFact {
  fieldId: string;
  value: unknown;
  confidence: 'high' | 'medium' | 'low';
  sourceText: string;
  reasoning?: string;
}

export interface AIProvider {
  extractFacts(
    transcript: string,
    formFields: readonly {
      id: string;
      label: string;
      type: string;
      aliases?: string[];
      values?: string[];
    }[],
    context: {
      childName?: string;
      assessmentType: 'initial' | 'follow-up';
    }
  ): Promise<ExtractedFact[]>;
}

export function createAIExtractor(provider: AIProvider) {
  return {
    async extractAndMap(
      transcript: string,
      formRegistry: typeof import('../schemas/form-registry').formRegistry,
      context: {
        childName?: string;
        assessmentType: 'initial' | 'follow-up';
      }
    ): Promise<ExtractedFact[]> {
      const formDef = context.assessmentType === 'initial'
        ? formRegistry.initialAssessment
        : formRegistry.followUpAssessment;

      const allFields = formDef.sections.flatMap(s => s.fields);
      return provider.extractFacts(transcript, allFields, context);
    }
  };
}
```

---

## Step 2 — OpenAI Provider

**File:** `ai-feature/packages/api/src/lib/openai-provider.ts` (NEW)

```typescript
import OpenAI from "openai";
import type { AIProvider, ExtractedFact } from './ai-provider';
import { env } from "@ai-feature/env";
import type { FieldDefinition } from '../schemas/ai-types';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export class OpenAIProvider implements AIProvider {
  async extractFacts(
    transcript: string,
    formFields: readonly FieldDefinition[],
    context: { childName?: string; assessmentType: 'initial' | 'follow-up' }
  ): Promise<ExtractedFact[]> {
    const fieldsList = formFields.map(f =>
      `- ${f.id}: ${f.label} (type: ${f.type})${f.aliases?.length ? `, aliases: ${f.aliases.join(', ')}` : ''}${f.values ? `, values: ${f.values.join(', ')}` : ''}`
    ).join('\n');

    const prompt = `You are an AI assistant helping a therapist document patient information from a conversation transcript.

Child name: ${context.childName ?? 'Unknown'}
Assessment type: ${context.assessmentType}

Form fields to extract:
${fieldsList}

Transcript:
${transcript}

Extract facts from the transcript and map them to the form fields above. For each extraction provide:
1. The field ID
2. The extracted value (use null if not found or uncertain)
3. Confidence level: "high" (clearly stated), "medium" (implied or partially stated), "low" (uncertain or requires inference)
4. The exact text from the transcript that supports this extraction
5. Brief reasoning if confidence is medium or low

Return ONLY valid JSON array:
[
  {"fieldId": "sectionA.patientName", "value": "Arjun", "confidence": "high", "sourceText": "Patient name is Arjun", "reasoning": null},
  {"fieldId": "sectionA.dob", "value": "2019-06-15", "confidence": "medium", "sourceText": "around 4 years old, born in 2019", "reasoning": "Age given, DOB inferred from age"}
]

Only extract values you are reasonably confident about. Do not guess or fabricate values.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a precise medical documentation assistant. Extract facts accurately.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1, // Low temperature for consistency
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return [];

    try {
      const parsed = JSON.parse(content);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(item =>
        item.fieldId && item.value !== undefined && ['high', 'medium', 'low'].includes(item.confidence)
      );
    } catch {
      return [];
    }
  }
}

export const openaiProvider = new OpenAIProvider();
```

---

## Step 3 — Anthropic Provider

**File:** `ai-feature/packages/api/src/lib/anthropic-provider.ts` (NEW)

```typescript
import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, ExtractedFact } from './ai-provider';
import { env } from "@ai-feature/env";
import type { FieldDefinition } from '../schemas/ai-types';

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

export class AnthropicProvider implements AIProvider {
  async extractFacts(
    transcript: string,
    formFields: readonly FieldDefinition[],
    context: { childName?: string; assessmentType: 'initial' | 'follow-up' }
  ): Promise<ExtractedFact[]> {
    const fieldsList = formFields.map(f =>
      `- ${f.id}: ${f.label} (type: ${f.type})${f.aliases?.length ? `, aliases: ${f.aliases.join(', ')}` : ''}${f.values ? `, values: ${f.values.join(', ')}` : ''}`
    ).join('\n');

    const prompt = `You are an AI assistant helping a therapist document patient information from a conversation transcript.

Child name: ${context.childName ?? 'Unknown'}
Assessment type: ${context.assessmentType}

Form fields to extract:
${fieldsList}

Transcript:
${transcript}

Extract facts from the transcript and map them to the form fields above. For each extraction provide:
1. The field ID
2. The extracted value (use null if not found or uncertain)
3. Confidence level: "high" (clearly stated), "medium" (implied or partially stated), "low" (uncertain or requires inference)
4. The exact text from the transcript that supports this extraction
5. Brief reasoning if confidence is medium or low

Return ONLY valid JSON array.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        { role: 'user', content: prompt }
      ],
    });

    const content = response.content[0]?.type === 'text' ? response.content[0].text : '';
    if (!content) return [];

    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];
      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(item =>
        item.fieldId && item.value !== undefined && ['high', 'medium', 'low'].includes(item.confidence)
      );
    } catch {
      return [];
    }
  }
}

export const anthropicProvider = new AnthropicProvider();
```

---

## Step 4 — AI Extractor

**File:** `ai-feature/packages/api/src/lib/ai-extractor.ts` (NEW)

```typescript
import { formRegistry } from '../schemas/form-registry';
import { env } from "@ai-feature/env";
import type { AIProvider, ExtractedFact } from './ai-provider';
import { openaiProvider } from './openai-provider';
import { anthropicProvider } from './anthropic-provider';

function getProvider(): AIProvider {
  switch (env.LLM_PROVIDER) {
    case 'anthropic':
      return anthropicProvider;
    case 'azure':
      // Azure uses same interface as OpenAI
      return openaiProvider;
    case 'openai':
    default:
      return openaiProvider;
  }
}

export class AIExtractor {
  private provider: AIProvider;

  constructor() {
    this.provider = getProvider();
  }

  async extractFacts(
    transcript: string,
    assessmentType: 'initial' | 'follow-up',
    context: { childName?: string }
  ): Promise<ExtractedFact[]> {
    const formDef = assessmentType === 'initial'
      ? formRegistry.initialAssessment
      : formRegistry.followUpAssessment;

    const allFields = formDef.sections.flatMap(s => s.fields);
    return this.provider.extractFacts(transcript, allFields, { ...context, assessmentType });
  }

  mapToFields(
    facts: ExtractedFact[],
    existingValues: Record<string, unknown>
  ): Map<string, ExtractedFact> {
    const fieldMap = new Map<string, ExtractedFact>();

    for (const fact of facts) {
      const existing = fieldMap.get(fact.fieldId);
      
      // If field already mapped, keep higher confidence one
      if (existing) {
        const existingConfidence = { high: 3, medium: 2, low: 1 };
        if (existingConfidence[fact.confidence] > existingConfidence[existing.confidence]) {
          fieldMap.set(fact.fieldId, fact);
        }
      } else {
        fieldMap.set(fact.fieldId, fact);
      }
    }

    return fieldMap;
  }
}

export const aiExtractor = new AIExtractor();
```

---

## Verification

- [ ] Extracts patient name, DOB, age from Malayalam transcript
- [ ] Correctly maps facts to `sectionA.patientName`, `sectionA.dob`, etc.
- [ ] Returns confidence scores (high/medium/low)
- [ ] Handles ambiguous extractions gracefully
- [ ] Provider can be swapped via LLM_PROVIDER env var
- [ ] `pnpm check-types` passes

## Blocked by

- BE-AI-02 (Sarvam STT) — recommended but not strictly required
- LLM Provider decision (OpenAI/Anthropic/Azure) — required before testing
