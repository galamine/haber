import type { FieldDefinition } from "../schemas/ai-types";

export interface ExtractedFact {
	fieldId: string;
	value: unknown;
	confidence: "high" | "medium" | "low";
	sourceText: string;
	reasoning?: string;
}

export interface AIProvider {
	extractFacts(
		transcript: string,
		formFields: readonly FieldDefinition[],
		context: {
			childName?: string;
			assessmentType: "initial" | "follow-up";
		},
	): Promise<ExtractedFact[]>;
}
