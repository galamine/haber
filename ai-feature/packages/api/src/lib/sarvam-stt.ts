import { env } from "@ai-feature/env";
import { SarvamAIClient } from "sarvamai";

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

	async transcribeFile(audioBuffer: Buffer): Promise<string> {
		const response = await this.client.speechToText.transcribe({
			file: audioBuffer,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			model: this.model as any,
			mode: "transcribe",
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			language_code: this.language as any,
		});

		return response.transcript ?? "";
	}

	async transcribeStream(
		audioBuffer: Buffer,
		_onTranscript: (chunk: TranscriptChunk) => void,
	): Promise<string> {
		const response = await this.client.speechToText.transcribe({
			file: audioBuffer,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			model: this.model as any,
			mode: "transcribe",
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			language_code: this.language as any,
		});

		const transcript = response.transcript ?? "";

		_onTranscript({
			text: transcript,
			startTime: 0,
			endTime: 0,
			isFinal: true,
		});

		return transcript;
	}
}

export const sarvamSTT = new SarvamSTTClient();
