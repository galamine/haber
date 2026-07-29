import { env } from "@ai-feature/env";
import { SarvamAIClient } from "sarvamai";
import { audioService } from "./audio-service";

interface TranscriptChunk {
	text: string;
	startTime: number;
	endTime: number;
	isFinal: boolean;
}

interface SarvamSTTOptions {
	model?: "saaras:v3";
	language?: string;
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
		this.language = options?.language ?? "ml-IN";
	}

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

	async transcribeStream(
		audioBuffer: Buffer,
		onTranscript: (chunk: TranscriptChunk) => void,
	): Promise<string> {
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
