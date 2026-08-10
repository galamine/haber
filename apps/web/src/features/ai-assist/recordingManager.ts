import { trpcClient } from "@/utils/trpc";
import type { AIDraft, RecordingStatus } from "./types";

const CHUNK_DURATION_MS = 28_000;
const CHUNK_INTERVAL_MS = 1_000;
const AUTO_STOP_MS = 30 * 60 * 1000;

const STORAGE_KEY = "ai-capture-session";

interface StoredSession {
	captureId: string;
	childId: string;
	assessmentType: "initial" | "follow-up";
	duration: number;
	status: RecordingStatus;
}

function saveSessionToStorage(session: StoredSession | null): void {
	if (session) {
		sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
	} else {
		sessionStorage.removeItem(STORAGE_KEY);
	}
}

function loadSessionFromStorage(): StoredSession | null {
	const stored = sessionStorage.getItem(STORAGE_KEY);
	if (!stored) return null;
	try {
		return JSON.parse(stored) as StoredSession;
	} catch {
		return null;
	}
}

function detectMimeType(): string {
	const types = [
		"audio/webm;codecs=opus",
		"audio/webm",
		"audio/mp4",
		"audio/ogg",
	];
	for (const type of types) {
		if (MediaRecorder.isTypeSupported(type)) {
			return type;
		}
	}
	return "audio/webm";
}

function blobToBase64(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve((reader.result as string).split(",")[1]);
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});
}

type Subscriber = () => void;

class RecordingManager {
	private mediaRecorder: MediaRecorder | null = null;
	private stream: MediaStream | null = null;
	private captureId: string | null = null;
	private childId = "";
	private assessmentType: "initial" | "follow-up" = "initial";
	private _status: RecordingStatus = "idle";
	private _duration = 0;
	private _error: string | null = null;

	private accumulatedChunks: Blob[] = [];
	private accumulatedDuration = 0;
	private chunkQueue: Blob[] = [];
	private isProcessing = false;
	private detectedMime = "";
	private headerChunk: Blob | null = null;

	private timerInterval: number | null = null;
	private autoStopTimeout: number | null = null;
	private lastTickTime = 0;

	private subscribers: Set<Subscriber> = new Set();
	private onDraftsCallback: ((drafts: AIDraft[]) => void) | null = null;

	get status(): RecordingStatus {
		return this._status;
	}

	get duration(): number {
		return this._duration;
	}

	get error(): string | null {
		return this._error;
	}

	get currentCaptureId(): string | null {
		return this.captureId;
	}

	get isActive(): boolean {
		return this._status === "recording" || this._status === "paused";
	}

	getState() {
		return {
			status: this._status,
			duration: this._duration,
			captureId: this.captureId,
			error: this._error,
			isProcessing: this.isProcessing,
		};
	}

	subscribe(fn: Subscriber): () => void {
		this.subscribers.add(fn);
		return () => {
			this.subscribers.delete(fn);
		};
	}

	registerDraftsCallback(fn: (drafts: AIDraft[]) => void): void {
		this.onDraftsCallback = fn;
	}

	private notify(): void {
		for (const fn of this.subscribers) {
			fn();
		}
	}

	private setStatus(s: RecordingStatus): void {
		this._status = s;
		this.notify();
	}

	private setError(e: string | null): void {
		this._error = e;
		this.notify();
	}

	private setDuration(d: number): void {
		this._duration = d;
		this.notify();
	}

	private startTimer(): void {
		this.stopTimer();
		this.lastTickTime = Date.now();
		this.timerInterval = window.setInterval(() => {
			const now = Date.now();
			const elapsed = now - this.lastTickTime;
			this.lastTickTime = now;

			this._duration += Math.round(elapsed / 1000);
			this.accumulatedDuration += elapsed;

			if (this.captureId) {
				saveSessionToStorage({
					captureId: this.captureId,
					childId: this.childId,
					assessmentType: this.assessmentType,
					duration: this._duration,
					status: this._status,
				});
			}

			this.notify();

			if (this.accumulatedDuration >= CHUNK_DURATION_MS) {
				this.flushAccumulatedChunks();
			}
		}, CHUNK_INTERVAL_MS);
	}

	private stopTimer(): void {
		if (this.timerInterval !== null) {
			clearInterval(this.timerInterval);
			this.timerInterval = null;
		}
	}

	private startAutoStop(): void {
		this.stopAutoStop();
		this.autoStopTimeout = window.setTimeout(() => {
			console.warn("[RecordingManager] Auto-stopping after 30 minutes");
			this.stop();
		}, AUTO_STOP_MS);
	}

	private stopAutoStop(): void {
		if (this.autoStopTimeout !== null) {
			clearTimeout(this.autoStopTimeout);
			this.autoStopTimeout = null;
		}
	}

	private async processQueue(): Promise<void> {
		if (this.isProcessing || this.chunkQueue.length === 0 || !this.captureId) {
			return;
		}

		this.isProcessing = true;
		const blob = this.chunkQueue.shift();
		if (!blob) {
			this.isProcessing = false;
			return;
		}

		try {
			const base64 = await blobToBase64(blob);

			const result = await trpcClient.ai.processAudioChunk.mutate({
				captureId: this.captureId,
				audioData: base64,
			});

			if (result.drafts.length > 0 && this.onDraftsCallback) {
				this.onDraftsCallback(result.drafts);
			}
		} catch (err) {
			console.error("Failed to process chunk:", err);
		}

		this.isProcessing = false;
		if (this.chunkQueue.length > 0) {
			this.processQueue();
		}
	}

	private async flushAccumulatedChunks(): Promise<void> {
		if (this.accumulatedChunks.length === 0) return;

		const chunksToBlob =
			this.headerChunk && this.accumulatedChunks[0] !== this.headerChunk
				? [this.headerChunk, ...this.accumulatedChunks]
				: this.accumulatedChunks;

		const blob = new Blob(chunksToBlob, { type: this.detectedMime });
		this.accumulatedChunks = [];
		this.accumulatedDuration = 0;

		this.chunkQueue.push(blob);
		return this.processQueue();
	}

	async start(
		childId: string,
		assessmentType: "initial" | "follow-up",
	): Promise<void> {
		if (this._status !== "idle") return;
		try {
			this.setError(null);
			this.accumulatedChunks = [];
			this.headerChunk = null;
			this.chunkQueue = [];
			this.isProcessing = false;
			this.accumulatedDuration = 0;
			this.setDuration(0);

			const capture = await trpcClient.ai.startCapture.mutate({
				childId,
				assessmentType,
				assessmentId: undefined,
			});
			this.captureId = capture.id;
			this.childId = childId;
			this.assessmentType = assessmentType;

			const stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					channelCount: 1,
					sampleRate: 16000,
					echoCancellation: true,
					noiseSuppression: true,
				},
			});

			this.stream = stream;
			this.detectedMime = detectMimeType();

			const recorder = new MediaRecorder(stream, {
				mimeType: this.detectedMime,
				audioBitsPerSecond: 128000,
			});

			this.mediaRecorder = recorder;

			recorder.ondataavailable = (e) => {
				if (e.data.size > 0) {
					if (!this.headerChunk) {
						this.headerChunk = e.data;
					}
					this.accumulatedChunks.push(e.data);
				}
			};

			recorder.onstop = () => {
				if (this.stream) {
					for (const track of this.stream.getTracks()) {
						track.stop();
					}
					this.stream = null;
				}
			};

			recorder.onerror = () => {
				this.setError("Recording error occurred. Please try again.");
				this.setStatus("idle");
				this.stopTimer();
				this.stopAutoStop();
				saveSessionToStorage(null);
			};

			recorder.start(1000);
			this.setStatus("recording");
			saveSessionToStorage({
				captureId: capture.id,
				childId,
				assessmentType,
				duration: 0,
				status: "recording",
			});

			this.startTimer();
			this.startAutoStop();
		} catch (err) {
			this.setError(
				err instanceof Error ? err.message : "Failed to start recording",
			);
			this.setStatus("idle");
			saveSessionToStorage(null);
		}
	}

	async pause(): Promise<void> {
		if (!this.mediaRecorder || this._status !== "recording") return;

		try {
			this.mediaRecorder.requestData();
			await this.flushAccumulatedChunks();
			this.accumulatedChunks = [];
			this.accumulatedDuration = 0;
			this.mediaRecorder.pause();
			this.setStatus("paused");
			this.stopTimer();
		} catch (err) {
			this.setError(
				err instanceof Error ? err.message : "Failed to pause recording",
			);
		}
	}

	async resume(): Promise<void> {
		if (!this.mediaRecorder || this._status !== "paused") return;

		try {
			this.accumulatedChunks = [];
			this.accumulatedDuration = 0;
			this.mediaRecorder.resume();
			this.setStatus("recording");
			this.startTimer();
		} catch (err) {
			this.setError(
				err instanceof Error ? err.message : "Failed to resume recording",
			);
		}
	}

	async stop(): Promise<void> {
		if (!this.mediaRecorder || this._status === "idle") return;

		try {
			await this.flushAccumulatedChunks();

			const timeout = Date.now() + 30_000;
			while (this.chunkQueue.length > 0 || this.isProcessing) {
				if (Date.now() > timeout) {
					this.chunkQueue = [];
					this.isProcessing = false;
					break;
				}
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			this.mediaRecorder.stop();
			this.stopTimer();
			this.stopAutoStop();
			this.setStatus("stopped");
			saveSessionToStorage(null);

			if (this.captureId) {
				await trpcClient.ai.endCapture.mutate({ captureId: this.captureId });
			}
		} catch (err) {
			this.setError(
				err instanceof Error ? err.message : "Failed to stop recording",
			);
		}
	}

	hydrateFromStorage(): void {
		const stored = loadSessionFromStorage();
		if (
			stored &&
			(stored.status === "recording" || stored.status === "paused")
		) {
			saveSessionToStorage(null);
		}
	}
}

export const recordingManager = new RecordingManager();
