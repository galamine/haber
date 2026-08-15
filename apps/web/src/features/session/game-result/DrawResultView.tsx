import type { DrawResultSummary } from "@haber-final/api/lib/game-result-summary";
import { Badge } from "@haber-final/ui/components/badge";

function Stat({
	label,
	value,
}: {
	label: string;
	value: string | number | null;
}) {
	if (value === null) return null;
	return (
		<div>
			<p className="text-muted-foreground text-xs">{label}</p>
			<p className="font-medium text-lg">{value}</p>
		</div>
	);
}

function pacingSummary(milestones: DrawResultSummary["milestones"]) {
	const lastMilestone = milestones.at(-1);
	if (!lastMilestone) return null;

	let maxGap = 0;
	let maxGapMilestone = milestones[0];
	let prevElapsed = 0;
	for (const milestone of milestones) {
		const gap = milestone.elapsedSec - prevElapsed;
		if (gap > maxGap) {
			maxGap = gap;
			maxGapMilestone = milestone;
		}
		prevElapsed = milestone.elapsedSec;
	}

	if (maxGapMilestone && maxGap > lastMilestone.elapsedSec * 0.5) {
		return `Paused longest before reaching ${maxGapMilestone.pct}% (${maxGap.toFixed(1)}s)`;
	}
	return "Steady pace throughout";
}

export function DrawResultView({ summary }: { summary: DrawResultSummary }) {
	const pacing = pacingSummary(summary.milestones);

	return (
		<div className="flex flex-col gap-4">
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
				<Stat
					label="Time Taken"
					value={
						summary.timeTakenSec !== null ? `${summary.timeTakenSec}s` : null
					}
				/>
				<Stat label="Drawing Coverage" value={summary.stampCount} />
				<Stat label="Item Shown" value={summary.item} />
			</div>

			{pacing && (
				<div>
					<p className="text-muted-foreground text-xs">Pacing</p>
					<p className="text-sm">{pacing}</p>
				</div>
			)}

			{summary.quiz && (
				<div>
					<p className="mb-1 text-muted-foreground text-xs">Quiz Result</p>
					<Badge variant={summary.quiz.correct ? "success" : "destructive"}>
						{summary.quiz.answered
							? summary.quiz.correct
								? `Correct${summary.quiz.attempts ? ` (attempt ${summary.quiz.attempts})` : ""}`
								: "Incorrect"
							: "Not answered"}
					</Badge>
				</div>
			)}
		</div>
	);
}
