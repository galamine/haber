import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@haber-final/ui/components/table";

type Props = { assessments: any[]; followUps: any[] };

export function SensoryProgress({ assessments, followUps }: Props) {
	const baseline = assessments?.[0]?.sensoryProfiles ?? [];
	const latest = followUps?.[0]?.sensoryProfiles ?? baseline;

	const rows = latest.map((sys: any, i: number) => {
		const base = baseline[i];
		const baseVal = Number.parseFloat(base?.rating ?? "0");
		const latestVal = Number.parseFloat(sys?.rating ?? "0");
		const change = latestVal - baseVal;

		return {
			system: sys.systemId ?? `System ${i + 1}`,
			baseline: baseVal,
			latest: latestVal,
			change,
		};
	});

	return (
		<section className="print-avoid-break">
			<h2 className="mb-4 font-medium text-display-xs">Sensory Progress</h2>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>System</TableHead>
						<TableHead>Baseline</TableHead>
						<TableHead>Latest</TableHead>
						<TableHead>Change</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{rows.map((row, i) => (
						<TableRow key={i}>
							<TableCell>{row.system}</TableCell>
							<TableCell>{row.baseline}</TableCell>
							<TableCell>{row.latest}</TableCell>
							<TableCell>
								{row.change > 0 ? (
									<span className="text-success-600">
										▲ {row.change.toFixed(1)}
									</span>
								) : row.change < 0 ? (
									<span className="text-danger-600">
										▼ {Math.abs(row.change).toFixed(1)}
									</span>
								) : (
									<span className="text-muted-foreground">—</span>
								)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</section>
	);
}
