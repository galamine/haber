import type { GameResultSummary } from "@haber-final/api/lib/game-result-summary";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@haber-final/ui/components/table";

type Props = { sessions: any[] };

function average(values: number[]) {
	if (values.length === 0) return null;
	return values.reduce((a, b) => a + b, 0) / values.length;
}

function summarizeFamilyStats(summaries: GameResultSummary[]): string {
	const family = summaries[0]?.family;

	if (family === "ARCADE") {
		const avgAccuracy = average(
			summaries.flatMap((s) =>
				s.family === "ARCADE" && s.accuracyPct !== null ? [s.accuracyPct] : [],
			),
		);
		return avgAccuracy !== null
			? `${Math.round(avgAccuracy)}% avg accuracy`
			: "—";
	}

	if (family === "SELECTION") {
		const avgAccuracy = average(
			summaries.flatMap((s) =>
				s.family === "SELECTION" && s.accuracy !== null ? [s.accuracy] : [],
			),
		);
		const avgDecisionTime = average(
			summaries.flatMap((s) =>
				s.family === "SELECTION" && s.meanDecisionTimeMs !== null
					? [s.meanDecisionTimeMs]
					: [],
			),
		);
		const parts: string[] = [];
		if (avgAccuracy !== null)
			parts.push(`${Math.round(avgAccuracy * 100)}% avg accuracy`);
		if (avgDecisionTime !== null)
			parts.push(`${Math.round(avgDecisionTime)}ms avg decision time`);
		return parts.length > 0 ? parts.join(", ") : "—";
	}

	if (family === "DRAW") {
		const avgTime = average(
			summaries.flatMap((s) =>
				s.family === "DRAW" && s.timeTakenSec !== null ? [s.timeTakenSec] : [],
			),
		);
		const quizzes = summaries.flatMap((s) =>
			s.family === "DRAW" && s.quiz ? [s.quiz] : [],
		);
		const parts: string[] = [];
		if (avgTime !== null) parts.push(`${Math.round(avgTime)}s avg time`);
		if (quizzes.length > 0) {
			const correctRate = Math.round(
				(quizzes.filter((q) => q.correct).length / quizzes.length) * 100,
			);
			parts.push(`${correctRate}% quiz correct`);
		}
		return parts.length > 0 ? parts.join(", ") : "—";
	}

	return "—";
}

export function SessionSummary({ sessions }: Props) {
	const total = sessions.length;
	const completed = sessions.filter(
		(s: any) => s.status === "COMPLETED",
	).length;
	const absent = sessions.filter((s: any) => s.status === "ABSENT").length;
	const manuallyClosed = sessions.filter(
		(s: any) => s.status === "MANUALLY_CLOSED",
	).length;

	const gameMap = new Map<
		string,
		{ count: number; summaries: GameResultSummary[] }
	>();
	for (const session of sessions) {
		for (const game of session.games ?? []) {
			const existing = gameMap.get(game.name) ?? { count: 0, summaries: [] };
			existing.count++;
			if (game.resultSummary && game.resultSummary.family !== "UNKNOWN") {
				existing.summaries.push(game.resultSummary);
			}
			gameMap.set(game.name, existing);
		}
	}

	const gameBreakdown = Array.from(gameMap.entries()).map(([name, data]) => ({
		name,
		count: data.count,
		stats: summarizeFamilyStats(data.summaries),
	}));

	return (
		<section className="print-avoid-break">
			<h2 className="mb-4 font-medium text-display-xs">Session Summary</h2>
			<dl className="mb-6 grid grid-cols-4 gap-4 text-sm">
				<div>
					<dt className="text-on-surface-variant">Total</dt>
					<dd className="font-medium">{total}</dd>
				</div>
				<div>
					<dt className="text-on-surface-variant">Completed</dt>
					<dd className="font-medium">{completed}</dd>
				</div>
				<div>
					<dt className="text-on-surface-variant">Absent</dt>
					<dd className="font-medium">{absent}</dd>
				</div>
				<div>
					<dt className="text-on-surface-variant">Manually Closed</dt>
					<dd className="font-medium">{manuallyClosed}</dd>
				</div>
			</dl>

			{gameBreakdown.length > 0 && (
				<>
					<h3 className="mb-2 font-medium text-sm">Per-Game Breakdown</h3>
					<Table className="w-full overflow-hidden">
						<TableHeader>
							<TableRow>
								<TableHead className="whitespace-normal">Game</TableHead>
								<TableHead className="whitespace-normal">
									Sessions Played
								</TableHead>
								<TableHead className="whitespace-normal">Performance</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{gameBreakdown.map((game) => (
								<TableRow key={game.name}>
									<TableCell className="whitespace-normal">
										{game.name}
									</TableCell>
									<TableCell className="whitespace-normal">
										{game.count}
									</TableCell>
									<TableCell className="whitespace-normal">
										{game.stats}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</>
			)}
		</section>
	);
}
