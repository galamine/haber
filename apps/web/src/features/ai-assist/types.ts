export interface AIDraft {
	fieldId: string;
	value: unknown;
	confidence: "high" | "medium" | "low";
	sourceText: string | null;
}

export type RecordingStatus = "idle" | "recording" | "paused" | "stopped";

export interface AICaptureState {
	captureId: string | null;
	status: RecordingStatus;
	duration: number;
	error: string | null;
}

export interface RecordingManagerState {
	status: RecordingStatus;
	duration: number;
	captureId: string | null;
	error: string | null;
	isProcessing: boolean;
}

export interface CaptureDraft {
	id: string;
	fieldId: string;
	value: unknown;
	confidence: "high" | "medium" | "low";
	sourceText: string | null;
	status: "active" | "superseded";
	createdAt: Date;
}

export interface ProcessAudioChunkResult {
	drafts: CaptureDraft[];
	transcriptSoFar: string;
}
