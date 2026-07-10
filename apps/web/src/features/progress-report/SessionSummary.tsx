import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@haber-final/ui/components/table";

type Props = { sessions: any[] };

export function SessionSummary({ sessions }: Props) {
	const total = sessions.length;
	const completed = sessions.filter(
		(s: any) => s.status === "COMPLETED",
	).length;
	const absent = sessions.filter((s: any) => s.status === "ABSENT").length;
	const manuallyClosed = sessions.filter(
		(s: any) => s.status === "MANUALLY_CLOSED",
	).length;

	const gameMap = new Map<string, { count: number; scores: number[] }>();
	for (const session of sessions) {
		for (const game of session.games ?? []) {
			const existing = gameMap.get(game.name) ?? { count: 0, scores: [] };
			existing.count++;
			if (game.score !== null) {
				existing.scores.push(game.score);
			}
			gameMap.set(game.name, existing);
		}
	}

	const gameBreakdown = Array.from(gameMap.entries()).map(([name, data]) => {
		const avgScore =
			data.scores.length > 0
				? Math.round(
						data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
					)
				: null;
		return { name, count: data.count, avgScore };
	});

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
								<TableHead className="whitespace-normal">Avg Score</TableHead>
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
										{game.avgScore !== null ? `${game.avgScore}%` : "—"}
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
