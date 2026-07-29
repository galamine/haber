import { readFileSync } from "fs";
import { aiExtractor } from "../packages/api/src/lib/ai-extractor";
import { sarvamSTT } from "../packages/api/src/lib/sarvam-stt";

const filePath = process.argv[2];
const language = process.argv[3] ?? "ml-IN";
const assessmentType = (process.argv[4] ?? "initial") as
	| "initial"
	| "follow-up";

if (!filePath) {
	console.error(
		"Usage: pnpm run test:stt [file-path] [language] [assessment-type]",
	);
	console.error("Example: pnpm run test:stt audio.mp3 ml-IN initial");
	process.exit(1);
}

// Step 1: STT
const audioBuffer = readFileSync(filePath);
console.log(
	`[1/2] Transcribing file: ${filePath} (${audioBuffer.length} bytes)`,
);
console.log(`Language: ${language}\n`);

const chunks = await sarvamSTT.transcribeFile(audioBuffer);

console.log("=== Transcript ===");
const transcript = chunks.map((c) => c.text).join(" ");
console.log(transcript || "(no transcript returned)");

// Step 2: AI Extraction
console.log(`\n[2/2] Extracting facts (assessment: ${assessmentType})...`);

const facts = await aiExtractor.extractFacts(transcript, assessmentType, {});
const fieldMap = aiExtractor.mapToFields(facts);

console.log("\n=== Extracted Facts ===");
if (fieldMap.size === 0) {
	console.log("(no facts extracted)");
} else {
	for (const [fieldId, fact] of fieldMap) {
		console.log(
			`\n${fieldId}: ${typeof fact.value === "object" ? JSON.stringify(fact.value) : fact.value}`,
		);
		console.log(`  Confidence: ${fact.confidence}`);
		console.log(`  Source: "${fact.sourceText}"`);
		if (fact.reasoning) {
			console.log(`  Reasoning: ${fact.reasoning}`);
		}
	}
}
