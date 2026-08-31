import type { GameResultSummary } from "@haber-final/api/lib/game-result-summary";

export type FamilyStatsInput = {
	gameName: string;
	resultSummary: GameResultSummary | null;
}[];

function average(values: number[]) {
	if (values.length === 0) return null;
	return values.reduce((a, b) => a + b, 0) / values.length;
}

function formatFamilyStats(summaries: GameResultSummary[]): string {
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

export function summarizeFamilyStats(
	sessions: { gameAssignments: FamilyStatsInput }[],
) {
	const gameMap = new Map<
		string,
		{ count: number; summaries: GameResultSummary[] }
	>();
	for (const session of sessions) {
		for (const game of session.gameAssignments) {
			const existing = gameMap.get(game.gameName) ?? {
				count: 0,
				summaries: [],
			};
			existing.count++;
			if (game.resultSummary && game.resultSummary.family !== "UNKNOWN") {
				existing.summaries.push(game.resultSummary);
			}
			gameMap.set(game.gameName, existing);
		}
	}

	return Array.from(gameMap.entries()).map(([name, data]) => ({
		name,
		count: data.count,
		stats: formatFamilyStats(data.summaries),
	}));
}
