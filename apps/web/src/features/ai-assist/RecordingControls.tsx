import { Badge } from "@haber-final/ui/components/badge";
import { Button } from "@haber-final/ui/components/button";
import { Loader2, Mic, Pause, Play, Square } from "lucide-react";
import type { RecordingStatus } from "./types";

interface RecordingControlsProps {
	status: RecordingStatus;
	duration: number;
	onStart: () => void;
	onPause: () => void;
	onResume: () => void;
	onStop: () => void;
	isProcessing?: boolean;
}

function formatDuration(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function RecordingControls({
	status,
	duration,
	onStart,
	onPause,
	onResume,
	onStop,
	isProcessing = false,
}: RecordingControlsProps) {
	if (status === "idle") {
		return (
			<Button onClick={onStart} disabled={isProcessing}>
				{isProcessing ? (
					<Loader2 className="mr-2 h-4 w-4 animate-spin" />
				) : (
					<Mic className="mr-2 h-4 w-4" />
				)}
				Start AI Assist
			</Button>
		);
	}

	if (status === "stopped") {
		return (
			<div className="flex items-center gap-2">
				<Badge variant="outline">Session Ended</Badge>
				<span className="font-mono text-muted-foreground text-sm">
					{formatDuration(duration)}
				</span>
			</div>
		);
	}

	return (
		<div className="flex items-center gap-2">
			<span className="font-medium font-mono text-lg">
				{formatDuration(duration)}
			</span>

			<Badge
				variant={status === "recording" ? "default" : "secondary"}
				className="flex items-center gap-1"
			>
				{status === "recording" && (
					<span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
				)}
				{status === "recording" ? "Recording" : "Paused"}
			</Badge>

			{status === "recording" ? (
				<Button
					variant="secondary"
					size="sm"
					onClick={onPause}
					disabled={isProcessing}
				>
					<Pause className="mr-1 h-4 w-4" />
					Pause
				</Button>
			) : (
				<Button
					variant="secondary"
					size="sm"
					onClick={onResume}
					disabled={isProcessing}
				>
					<Play className="mr-1 h-4 w-4" />
					Resume
				</Button>
			)}

			<Button variant="destructive" size="sm" onClick={onStop}>
				<Square className="mr-1 h-4 w-4" />
				Stop
			</Button>
		</div>
	);
}
