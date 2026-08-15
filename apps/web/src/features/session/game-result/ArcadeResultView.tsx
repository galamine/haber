import type { ArcadeResultSummary } from "@haber-final/api/lib/game-result-summary";

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

export function ArcadeResultView({
	summary,
}: {
	summary: ArcadeResultSummary;
}) {
	return (
		<div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
			<Stat label="In-Game Score" value={summary.inGameScore} />
			<Stat label="Hits" value={summary.hits} />
			<Stat label="Missed" value={summary.missed} />
			<Stat
				label="Accuracy"
				value={summary.accuracyPct !== null ? `${summary.accuracyPct}%` : null}
			/>
			<Stat label="Best Streak" value={summary.bestStreak} />
			<Stat
				label="Time Played"
				value={
					summary.timePlayedSec !== null ? `${summary.timePlayedSec}s` : null
				}
			/>
		</div>
	);
}
