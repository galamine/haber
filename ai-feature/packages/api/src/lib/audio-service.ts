import ffstatic from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import { PassThrough, Writable } from "stream";

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
		const ffmpegPath = ffstatic;
		if (!ffmpegPath) {
			throw new Error("ffmpeg-static path not found");
		}
		ffmpeg.setFfmpegPath(ffmpegPath);
	}

	async convertToWav(webmBuffer: Buffer): Promise<Buffer> {
		return new Promise((resolve, reject) => {
			const chunks: Buffer[] = [];

			const passThrough = new PassThrough();
			passThrough.write(webmBuffer);
			passThrough.end();

			const writable = new Writable({
				write(chunk: Buffer, _encoding, callback) {
					chunks.push(chunk);
					callback();
				},
			});

			ffmpeg(passThrough)
				.toFormat("wav")
				.audioChannels(this.channels)
				.audioFrequency(this.sampleRate)
				.pipe(writable)
				.on("finish", () => resolve(Buffer.concat(chunks)))
				.on("error", reject);
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
