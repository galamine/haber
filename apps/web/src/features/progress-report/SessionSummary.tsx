import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@haber-final/ui/components/table";
import { summarizeFamilyStats } from "@/features/session/summarize-family-stats";

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

	const gameBreakdown = summarizeFamilyStats(
		sessions.map((session: any) => ({
			gameAssignments: (session.games ?? []).map((game: any) => ({
				gameName: game.name,
				resultSummary: game.resultSummary,
			})),
		})),
	);

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
