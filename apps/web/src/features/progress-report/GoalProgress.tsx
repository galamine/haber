import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@haber-final/ui/components/table";

type Props = { goals: any[] };

export function GoalProgress({ goals }: Props) {
	return (
		<section className="print-avoid-break">
			<h2 className="mb-4 font-medium text-display-xs">Goal Progress</h2>
			<Table className="w-full overflow-hidden">
				<TableHeader>
					<TableRow>
						<TableHead className="whitespace-normal">Goal</TableHead>
						<TableHead className="whitespace-normal">Horizon</TableHead>
						<TableHead className="whitespace-normal">Target %</TableHead>
						<TableHead className="whitespace-normal">Current %</TableHead>
						<TableHead className="whitespace-normal">Status</TableHead>
						<TableHead className="whitespace-normal">Evidence Note</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{goals.map((goal: any) => {
						const latestEntry = goal.progressEntries?.[0];
						return (
							<TableRow key={goal.id}>
								<TableCell className="whitespace-normal">
									{goal.description}
								</TableCell>
								<TableCell className="whitespace-normal">
									{goal.horizon?.replace("_", " ")}
								</TableCell>
								<TableCell className="whitespace-normal">
									{goal.targetAttainmentPct}%
								</TableCell>
								<TableCell className="whitespace-normal">
									{goal.currentAttainmentPct}%
								</TableCell>
								<TableCell className="whitespace-normal">
									<span
										className={`rounded px-2 py-0.5 text-xs ${
											goal.status === "ON_TRACK"
												? "bg-success-100 text-success-700"
												: goal.status === "BEHIND"
													? "bg-warning-100 text-warning-700"
													: "bg-muted text-muted-foreground"
										}`}
									>
										{goal.status?.replace("_", " ")}
									</span>
								</TableCell>
								<TableCell className="whitespace-normal text-on-surface-variant text-xs">
									{latestEntry?.evidenceNotes ?? "—"}
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</section>
	);
}
