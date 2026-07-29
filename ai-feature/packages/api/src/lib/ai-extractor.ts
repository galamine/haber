import { env } from "@ai-feature/env";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { FieldDefinition } from "../schemas/ai-types";
import { formRegistry } from "../schemas/form-registry";
import type { AIProvider, ExtractedFact } from "./ai-provider";

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

export class GeminiProvider implements AIProvider {
	async extractFacts(
		transcript: string,
		formFields: readonly FieldDefinition[],
		context: { childName?: string; assessmentType: "initial" | "follow-up" },
	): Promise<ExtractedFact[]> {
		const fieldsList = formFields
			.map((f) => {
				let fieldStr = `- ${f.id}: ${f.label} (type: ${f.type})`;
				if (f.aliases && f.aliases.length) {
					fieldStr += `, aliases: ${f.aliases.join(", ")}`;
				}
				if (f.values) {
					fieldStr += `, values: ${f.values.join(", ")}`;
				}
				return fieldStr;
			})
			.join("\n");

		const prompt = `You are an AI assistant helping a therapist document patient information from a conversation transcript.

Child name: ${context.childName ?? "Unknown"}
Assessment type: ${context.assessmentType}

Form fields to extract:
${fieldsList}

Transcript:
${transcript}

Extract facts from the transcript and map them to the form fields above. For each extraction provide:
1. The field ID
2. The extracted value in ENGLISH (translate if transcript is in Malayalam, Hindi, or other languages)
3. Confidence level: "high" (clearly stated), "medium" (implied or partially stated), "low" (uncertain or requires inference)
4. The exact text from the transcript that supports this extraction (keep original language)
5. Brief reasoning if confidence is medium or low

IMPORTANT: All extracted VALUES must be in ENGLISH. Translate names, symptoms, and any text from the transcript to English before returning.

Return ONLY valid JSON array:
[
  {"fieldId": "sectionA.patientName", "value": "Sooraj", "confidence": "high", "sourceText": "എൻ്റെ പേര് സൂരജ്", "reasoning": null},
  {"fieldId": "sectionA.age", "value": {"years": 24, "months": 0}, "confidence": "high", "sourceText": "എനിക്ക് 24 വയസ്സാണ്", "reasoning": null},
  {"fieldId": "sectionA.dob", "value": "2000-01-01", "confidence": "medium", "sourceText": "around 24 years old", "reasoning": "DOB inferred from age"}
]

Only extract values you are reasonably confident about. Do not guess or fabricate values.`;

		const model = genAI.getGenerativeModel({ model: env.GEMINI_MODEL });

		const result = await model.generateContent(prompt);
		const response = result.response;
		const content = response.text();

		if (!content) return [];

		try {
			const jsonMatch = content.match(/\[[\s\S]*\]/);
			if (!jsonMatch) return [];
			const parsed = JSON.parse(jsonMatch[0]);
			if (!Array.isArray(parsed)) return [];
			return parsed.filter(
				(item) =>
					item.fieldId &&
					item.value !== undefined &&
					["high", "medium", "low"].includes(item.confidence),
			);
		} catch {
			return [];
		}
	}
}

function createProvider(): AIProvider {
	switch (env.LLM_PROVIDER) {
		case "gemini":
			return new GeminiProvider();
		case "openai":
		case "anthropic":
		case "azure":
		default:
			throw new Error(
				`LLM provider "${env.LLM_PROVIDER}" is not implemented. Add provider class and update createProvider() in ai-extractor.ts`,
			);
	}
}

const llmProvider = createProvider();

export class AIExtractor {
	async extractFacts(
		transcript: string,
		assessmentType: "initial" | "follow-up",
		context: { childName?: string },
	): Promise<ExtractedFact[]> {
		const formDef =
			assessmentType === "initial"
				? formRegistry.initialAssessment
				: formRegistry.followUpAssessment;

		const allFields: readonly FieldDefinition[] = formDef.sections.flatMap(
			(s) => s.fields as unknown as readonly FieldDefinition[],
		);
		return llmProvider.extractFacts(transcript, allFields, {
			...context,
			assessmentType,
		});
	}

	mapToFields(facts: ExtractedFact[]): Map<string, ExtractedFact> {
		const fieldMap = new Map<string, ExtractedFact>();

		for (const fact of facts) {
			const existing = fieldMap.get(fact.fieldId);

			if (existing) {
				const existingConfidence = { high: 3, medium: 2, low: 1 };
				if (
					existingConfidence[fact.confidence] >
					existingConfidence[existing.confidence]
				) {
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
