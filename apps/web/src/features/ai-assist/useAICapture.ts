import { useEffect, useRef, useState } from "react";
import { recordingManager } from "./recordingManager";
import type { AIDraft, RecordingStatus } from "./types";

interface UseAICaptureOptions {
	childId: string;
	assessmentType: "initial" | "follow-up";
	onDraftsReceived: (drafts: AIDraft[]) => void;
}

interface UseAICaptureReturn {
	status: RecordingStatus;
	duration: number;
	captureId: string | null;
	error: string | null;
	isProcessing: boolean;
	startCapture: () => Promise<void>;
	pauseCapture: () => Promise<void>;
	resumeCapture: () => Promise<void>;
	stopCapture: () => Promise<void>;
}

export function useAICapture({
	childId,
	assessmentType,
	onDraftsReceived,
}: UseAICaptureOptions): UseAICaptureReturn {
	const [state, setState] = useState(recordingManager.getState());
	const onDraftsRef = useRef(onDraftsReceived);
	onDraftsRef.current = onDraftsReceived;

	useEffect(() => {
		recordingManager.hydrateFromStorage();

		recordingManager.registerDraftsCallback((drafts: AIDraft[]) => {
			onDraftsRef.current(drafts);
		});

		const unsub = recordingManager.subscribe(() => {
			setState(recordingManager.getState());
		});

		setState(recordingManager.getState());

		return unsub;
	}, []);

	return {
		status: state.status,
		duration: state.duration,
		captureId: state.captureId,
		error: state.error,
		isProcessing: state.isProcessing,
		startCapture: () => recordingManager.start(childId, assessmentType),
		pauseCapture: () => recordingManager.pause(),
		resumeCapture: () => recordingManager.resume(),
		stopCapture: () => recordingManager.stop(),
	};
}
