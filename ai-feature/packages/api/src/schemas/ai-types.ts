import { z } from "zod";

export const ConfidenceSchema = z.enum(["high", "medium", "low"]);
export const SessionStatusSchema = z.enum(["active", "paused", "completed"]);
export const DraftStatusSchema = z.enum(["active", "superseded"]);

export type Confidence = z.infer<typeof ConfidenceSchema>;
export type SessionStatus = z.infer<typeof SessionStatusSchema>;
export type DraftStatus = z.infer<typeof DraftStatusSchema>;

export interface FieldDefinition {
	id: string;
	label: string;
	type:
		| "string"
		| "number"
		| "boolean"
		| "date"
		| "enum"
		| "array-string"
		| "array-object"
		| "object";
	values?: string[];
	fields?: string[];
	aliases?: string[];
}

export interface SectionDefinition {
	id: string;
	name: string;
	fields: FieldDefinition[];
}

export interface FormDefinition {
	id: string;
	sections: SectionDefinition[];
}
