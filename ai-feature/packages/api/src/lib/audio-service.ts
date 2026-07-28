import ffstatic from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";

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
