import { Badge } from "@haber-final/ui/components/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@haber-final/ui/components/card";
import { Mic } from "lucide-react";
import { useCallback, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { applyDraftsToForm } from "./fieldMapper";
import { RecordingControls } from "./RecordingControls";
import type { AIDraft } from "./types";
import { useAICapture } from "./useAICapture";

interface AIAssistPanelProps {
	childId: string;
	assessmentType: "initial" | "follow-up";
	form: UseFormReturn<Record<string, unknown>>;
	milestoneById: Record<string, string>;
	sensorySystemById: Record<string, string>;
	functionalConcernOptions?: { id: string; label: string }[];
}

export function AIAssistPanel({
	childId,
	assessmentType,
	form,
	milestoneById,
	sensorySystemById,
	functionalConcernOptions = [],
}: AIAssistPanelProps) {
	const [drafts, setDrafts] = useState<AIDraft[]>([]);

	const handleDraftsReceived = useCallback(
		(newDrafts: AIDraft[]) => {
			setDrafts((prev) => [...prev, ...newDrafts]);
			applyDraftsToForm(
				newDrafts,
				form,
				milestoneById,
				sensorySystemById,
				functionalConcernOptions,
			);
		},
		[form, milestoneById, sensorySystemById, functionalConcernOptions],
	);

	const capture = useAICapture({
		childId,
		assessmentType,
		onDraftsReceived: handleDraftsReceived,
	});

	const fieldsFilledCount = drafts.length;

	return (
		<Card className="mb-6">
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Mic className="h-5 w-5 text-muted-foreground" />
						<CardTitle className="text-lg">AI Clinical Documentation</CardTitle>
					</div>
					<div className="flex items-center gap-3">
						{fieldsFilledCount > 0 && (
							<Badge variant="secondary">
								{fieldsFilledCount} field{fieldsFilledCount !== 1 ? "s" : ""}{" "}
								filled
							</Badge>
						)}
						<RecordingControls
							status={capture.status}
							duration={capture.duration}
							isProcessing={capture.isProcessing}
							onStart={capture.startCapture}
							onPause={capture.pauseCapture}
							onResume={capture.resumeCapture}
							onStop={capture.stopCapture}
						/>
					</div>
				</div>
			</CardHeader>
			{capture.error && (
				<CardContent>
					<div className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm">
						{capture.error}
					</div>
				</CardContent>
			)}
		</Card>
	);
}
