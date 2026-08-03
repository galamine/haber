import { Badge } from "@haber-final/ui/components/badge";
import { Button } from "@haber-final/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@haber-final/ui/components/card";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { trpc } from "@/utils/trpc";

interface ExtractedFact {
	fieldId: string;
	value: unknown;
	confidence: "high" | "medium" | "low";
	sourceText: string | null;
}

interface ChunkResult {
	id: number;
	transcript: string;
	extractedFacts: ExtractedFact[];
	status: "pending" | "processing" | "success" | "failed";
	error?: string;
	timestamp: number;
}

export const Route = createFileRoute("/test-audio")({
	component: TestAudioPage,
});

function TestAudioPage() {
	const [isRecording, setIsRecording] = useState(false);
	const [isPaused, setIsPaused] = useState(false);
	const [duration, setDuration] = useState(0);
	const [mimeType, setMimeType] = useState<string>("");
	const [chunkCount, setChunkCount] = useState(0);
	const [_audioBlob, setAudioBlob] = useState<Blob | null>(null);
	const [audioUrl, setAudioUrl] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [assessmentType, setAssessmentType] = useState<"initial" | "follow-up">(
		"initial",
	);
	const [chunkResults, setChunkResults] = useState<ChunkResult[]>([]);

	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const chunksRef = useRef<Blob[]>([]);
	const timerRef = useRef<number | null>(null);
	const accumulatedChunksRef = useRef<Blob[]>([]);
	const chunkQueueRef = useRef<Blob[]>([]);
	const isProcessingChunkRef = useRef(false);
	const accumulatedDurationRef = useRef(0);
	const detectedMimeRef = useRef<string>("");
	const headerChunkRef = useRef<Blob | null>(null);

	const CHUNK_DURATION_MS = 28_000;
	const CHUNK_INTERVAL_MS = 1_000;

	const blobToBase64 = useCallback((blob: Blob): Promise<string> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve((reader.result as string).split(",")[1]);
			reader.onerror = reject;
			reader.readAsDataURL(blob);
		});
	}, []);

	const processAudioChunkMutation = useMutation(
		trpc.ai.testTranscribe.mutationOptions({
			onSuccess: (data) => {
				setChunkResults((prev) => {
					const processing = prev.find((r) => r.status === "processing");
					if (processing) {
						return prev.map((r) =>
							r.id === processing.id
								? {
										...r,
										status: "success",
										transcript: data.transcript,
										extractedFacts: data.extractedFacts,
									}
								: r,
						);
					}
					return prev;
				});
				isProcessingChunkRef.current = false;
				if (chunkQueueRef.current.length > 0) {
					processQueue();
				}
			},
			onError: (error) => {
				setChunkResults((prev) => {
					const processing = prev.find((r) => r.status === "processing");
					if (processing) {
						return prev.map((r) =>
							r.id === processing.id
								? { ...r, status: "failed", error: error.message }
								: r,
						);
					}
					return prev;
				});
				isProcessingChunkRef.current = false;
				if (chunkQueueRef.current.length > 0) {
					processQueue();
				}
			},
		}),
	);

	const processQueue = useCallback(async () => {
		if (isProcessingChunkRef.current || chunkQueueRef.current.length === 0)
			return;

		isProcessingChunkRef.current = true;
		const blob = chunkQueueRef.current.shift();
		if (!blob) {
			isProcessingChunkRef.current = false;
			return;
		}

		const chunkId = Date.now();
		setChunkResults((prev) => [
			...prev,
			{
				id: chunkId,
				transcript: "",
				extractedFacts: [],
				status: "processing",
				timestamp: chunkId,
			},
		]);

		try {
			const base64 = await blobToBase64(blob);
			processAudioChunkMutation.mutate({
				audioData: base64,
				assessmentType,
				chunkIndex: chunkCount,
			});
		} catch (err) {
			setChunkResults((prev) =>
				prev.map((r) =>
					r.id === chunkId
						? {
								...r,
								status: "failed",
								error:
									err instanceof Error
										? err.message
										: "Failed to process chunk",
							}
						: r,
				),
			);
			isProcessingChunkRef.current = false;
			if (chunkQueueRef.current.length > 0) {
				processQueue();
			}
		}
	}, [
		assessmentType,
		chunkCount,
		processAudioChunkMutation.mutate,
		blobToBase64,
	]);

	const flushAccumulatedChunks = useCallback(() => {
		if (accumulatedChunksRef.current.length === 0) return;

		const chunksToBlob =
			headerChunkRef.current &&
			accumulatedChunksRef.current[0] !== headerChunkRef.current
				? [headerChunkRef.current, ...accumulatedChunksRef.current]
				: accumulatedChunksRef.current;

		const blob = new Blob(chunksToBlob, { type: detectedMimeRef.current });
		accumulatedChunksRef.current = [];
		accumulatedDurationRef.current = 0;

		chunkQueueRef.current.push(blob);
		setChunkCount((c) => c + 1);

		processQueue();
	}, [processQueue]);

	useEffect(() => {
		return () => {
			if (audioUrl) {
				URL.revokeObjectURL(audioUrl);
			}
			if (timerRef.current) {
				clearInterval(timerRef.current);
			}
			chunkQueueRef.current = [];
			accumulatedChunksRef.current = [];
		};
	}, [audioUrl]);

	const detectMimeType = (): string => {
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
	};

	const startRecording = async () => {
		try {
			setError(null);
			chunksRef.current = [];
			accumulatedChunksRef.current = [];
			headerChunkRef.current = null;
			chunkQueueRef.current = [];
			isProcessingChunkRef.current = false;
			accumulatedDurationRef.current = 0;
			setChunkCount(0);
			setDuration(0);
			setAudioBlob(null);
			setAudioUrl(null);
			setChunkResults([]);

			const stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					channelCount: 1,
					sampleRate: 16000,
					echoCancellation: true,
					noiseSuppression: true,
				},
			});

			const detectedMime = detectMimeType();
			detectedMimeRef.current = detectedMime;
			setMimeType(detectedMime);

			const recorder = new MediaRecorder(stream, {
				mimeType: detectedMime,
				audioBitsPerSecond: 128000,
			});

			mediaRecorderRef.current = recorder;

			recorder.ondataavailable = (e) => {
				if (e.data.size > 0) {
					if (!headerChunkRef.current) {
						headerChunkRef.current = e.data;
					}
					accumulatedChunksRef.current.push(e.data);
					chunksRef.current.push(e.data);
				}
			};

			recorder.onstop = () => {
				const blob = new Blob(chunksRef.current, { type: detectedMime });
				setAudioBlob(blob);
				const url = URL.createObjectURL(blob);
				setAudioUrl(url);
				stream.getTracks().forEach((track) => {
					track.stop();
				});
			};

			recorder.start(1000);
			setIsRecording(true);

			timerRef.current = window.setInterval(() => {
				setDuration((d) => d + 1);
				accumulatedDurationRef.current += 1000;

				if (accumulatedDurationRef.current >= CHUNK_DURATION_MS) {
					flushAccumulatedChunks();
				}
			}, CHUNK_INTERVAL_MS);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to start recording",
			);
		}
	};

	const pauseRecording = () => {
		if (mediaRecorderRef.current && isRecording) {
			mediaRecorderRef.current.requestData();
			flushAccumulatedChunks();
			accumulatedChunksRef.current = [];
			accumulatedDurationRef.current = 0;
			//headerChunkRef.current = null;
			mediaRecorderRef.current.pause();
			setIsPaused(true);
			if (timerRef.current) {
				clearInterval(timerRef.current);
				timerRef.current = null;
			}
		}
	};

	const resumeRecording = () => {
		if (mediaRecorderRef.current && isPaused) {
			accumulatedChunksRef.current = [];
			accumulatedDurationRef.current = 0;
			//headerChunkRef.current = null;
			mediaRecorderRef.current.resume();
			setIsPaused(false);
			timerRef.current = window.setInterval(() => {
				setDuration((d) => d + 1);
				accumulatedDurationRef.current += 1000;
				if (accumulatedDurationRef.current >= CHUNK_DURATION_MS) {
					flushAccumulatedChunks();
				}
			}, CHUNK_INTERVAL_MS);
		}
	};

	const stopRecording = () => {
		if (mediaRecorderRef.current && isRecording) {
			flushAccumulatedChunks();

			mediaRecorderRef.current.stop();
			setIsRecording(false);
			setIsPaused(false);
			if (timerRef.current) {
				clearInterval(timerRef.current);
				timerRef.current = null;
			}
		}
	};

	const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		setError(null);
		setAudioBlob(file);
		const url = URL.createObjectURL(file);
		setAudioUrl(url);

		const base64 = await blobToBase64(file);
		const chunkId = Date.now();
		setChunkResults([
			{
				id: chunkId,
				transcript: "",
				extractedFacts: [],
				status: "processing",
				timestamp: chunkId,
			},
		]);
		processAudioChunkMutation.mutate({
			audioData: base64,
			assessmentType,
			chunkIndex: 0,
		});
	};

	const downloadRecording = () => {
		if (!audioUrl) return;
		const a = document.createElement("a");
		a.href = audioUrl;
		const extension = mimeType.includes("webm")
			? "webm"
			: mimeType.includes("mp4")
				? "mp4"
				: "ogg";
		a.download = `recording-${Date.now()}.${extension}`;
		a.click();
	};

	const formatDuration = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
	};

	const clearResults = () => {
		setChunkResults([]);
	};

	const _isProcessing = processAudioChunkMutation.isPending;

	return (
		<div className="container mx-auto max-w-2xl py-8">
			<h1 className="mb-8 font-bold text-3xl">STT & AI Extraction Test</h1>

			<Card className="mb-6">
				<CardHeader>
					<CardTitle>Audio Input</CardTitle>
					<CardDescription>
						Record audio or upload a file to test transcription and AI
						extraction
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="flex flex-wrap items-center gap-3">
						<select
							value={assessmentType}
							onChange={(e) =>
								setAssessmentType(e.target.value as "initial" | "follow-up")
							}
							className="rounded-md border border-input bg-background px-3 py-2 text-sm"
						>
							<option value="initial">Initial Assessment</option>
							<option value="follow-up">Follow-up Assessment</option>
						</select>
					</div>

					<div className="flex flex-wrap gap-3">
						{!isRecording ? (
							<Button onClick={startRecording}>Start Recording</Button>
						) : (
							<>
								{isPaused ? (
									<Button onClick={resumeRecording} variant="default">
										Resume
									</Button>
								) : (
									<Button onClick={pauseRecording} variant="secondary">
										Pause
									</Button>
								)}
								<Button onClick={stopRecording} variant="destructive">
									Stop
								</Button>
							</>
						)}

						<label className="cursor-pointer">
							<input
								type="file"
								accept="audio/webm,audio/mp4,audio/mp3,audio/wav,audio/ogg,.webm,.mp4,.mp3,.wav,.ogg"
								onChange={handleFileUpload}
								className="hidden"
							/>
							<Button variant="outline" asChild>
								<span>Upload Audio File</span>
							</Button>
						</label>
					</div>

					{error && (
						<div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
							{error}
						</div>
					)}

					<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
						<div className="rounded-lg border p-3">
							<p className="text-muted-foreground text-xs">Status</p>
							<Badge
								variant={
									isRecording ? (isPaused ? "secondary" : "default") : "outline"
								}
							>
								{isRecording ? (isPaused ? "Paused" : "Recording") : "Idle"}
							</Badge>
						</div>
						<div className="rounded-lg border p-3">
							<p className="text-muted-foreground text-xs">Duration</p>
							<p className="font-mono text-2xl">{formatDuration(duration)}</p>
						</div>
						<div className="rounded-lg border p-3">
							<p className="text-muted-foreground text-xs">Format</p>
							<p className="break-all font-mono text-xs">{mimeType || "-"}</p>
						</div>
						<div className="rounded-lg border p-3">
							<p className="text-muted-foreground text-xs">Chunks</p>
							<p className="font-mono text-2xl">{chunkCount}</p>
						</div>
					</div>
				</CardContent>
			</Card>

			{audioUrl && (
				<Card className="mb-6">
					<CardHeader>
						<CardTitle>Recording Preview</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{/* biome-ignore lint/a11y/useMediaCaption: test audio playback */}
						<audio controls src={audioUrl} className="w-full" />
						<Button onClick={downloadRecording} className="w-full">
							Download Recording
						</Button>
					</CardContent>
				</Card>
			)}

			{chunkResults.length > 0 && (
				<Card className="mb-6">
					<CardHeader>
						<div className="flex items-center justify-between">
							<CardTitle>Chunk Results ({chunkResults.length})</CardTitle>
							<Button variant="ghost" size="sm" onClick={clearResults}>
								Clear
							</Button>
						</div>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{chunkResults.map((result) => (
								<div key={result.id} className="rounded-lg border p-4">
									<div className="flex items-center justify-between">
										<Badge
											variant={
												result.status === "success"
													? "default"
													: result.status === "failed"
														? "destructive"
														: "secondary"
											}
										>
											{result.status === "processing" && (
												<Loader2 className="mr-1 h-3 w-3 animate-spin" />
											)}
											{result.status} —{" "}
											{new Date(result.timestamp).toLocaleTimeString()}
										</Badge>
									</div>

									{result.status === "success" && result.transcript && (
										<div className="mt-3">
											<p className="text-muted-foreground text-xs">
												Transcript:
											</p>
											<p className="mt-1 rounded bg-muted p-2 text-sm">
												{result.transcript}
											</p>
										</div>
									)}

									{result.status === "success" &&
										result.extractedFacts.length > 0 && (
											<div className="mt-3 space-y-2">
												<p className="text-muted-foreground text-xs">
													Extracted Facts:
												</p>
												{result.extractedFacts.map((fact, idx) => (
													<div key={idx} className="rounded bg-muted p-2">
														<div className="flex items-center justify-between">
															<span className="font-mono text-sm">
																{fact.fieldId}
															</span>
															<Badge
																variant={
																	fact.confidence === "high"
																		? "default"
																		: fact.confidence === "medium"
																			? "secondary"
																			: "outline"
																}
															>
																{fact.confidence}
															</Badge>
														</div>
														<p className="mt-1 text-sm">
															Value:{" "}
															{typeof fact.value === "object"
																? JSON.stringify(fact.value)
																: String(fact.value)}
														</p>
													</div>
												))}
											</div>
										)}

									{result.status === "success" &&
										result.extractedFacts.length === 0 && (
											<p className="mt-2 text-muted-foreground text-sm">
												No facts extracted from this chunk.
											</p>
										)}

									{result.status === "failed" && result.error && (
										<p className="mt-2 text-destructive text-sm">
											Error: {result.error}
										</p>
									)}
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
