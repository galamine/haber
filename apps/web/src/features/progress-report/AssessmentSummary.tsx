import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@haber-final/ui/components/table";

type Props = { report: any };

export function AssessmentSummary({ report }: Props) {
	const { assessments } = report;
	const latest = assessments?.[0];
	const sectionC = latest?.sectionC as any;
	const milestones = sectionC?.milestones ?? [];
	const sensoryProfiles = latest?.sensoryProfiles ?? [];
	const tools = sectionC?.standardisedTools ?? [];
	const chiefComplaint = sectionC?.chiefComplaint;
	const primaryDiagnoses = sectionC?.primaryDiagnoses ?? [];

	return (
		<section className="print-avoid-break">
			<h2 className="mb-4 font-medium text-display-xs">
				Assessment Summary (Form 1)
			</h2>

			{chiefComplaint && (
				<div className="mb-4">
					<h3 className="mb-1 font-medium text-sm">Chief Complaint</h3>
					<p className="text-on-surface-variant text-sm">{chiefComplaint}</p>
				</div>
			)}

			{primaryDiagnoses.length > 0 && (
				<div className="mb-4">
					<h3 className="mb-1 font-medium text-sm">Primary Diagnoses</h3>
					<ul className="list-inside list-disc text-on-surface-variant text-sm">
						{primaryDiagnoses.map((d: any, i: number) => (
							<li key={i}>{d?.description ?? d}</li>
						))}
					</ul>
				</div>
			)}

			<h3 className="mb-2 font-medium text-sm">Milestones</h3>
			<Table className="mb-6">
				<TableHeader>
					<TableRow>
						<TableHead>Milestone</TableHead>
						<TableHead>Achieved Age</TableHead>
						<TableHead>Delayed</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{milestones.slice(0, 12).map((m: any, i: number) => (
						<TableRow key={i}>
							<TableCell>{m?.description ?? `Milestone ${i + 1}`}</TableCell>
							<TableCell>{m?.achievedAge ?? "—"}</TableCell>
							<TableCell>{m?.isDelayed ? "Yes" : "No"}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>

			<h3 className="mb-2 font-medium text-sm">Sensory Profile</h3>
			<Table className="mb-6">
				<TableHeader>
					<TableRow>
						<TableHead>System</TableHead>
						<TableHead>Rating</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{sensoryProfiles.map((sp: any, i: number) => (
						<TableRow key={i}>
							<TableCell>{sp.systemId ?? `System ${i + 1}`}</TableCell>
							<TableCell>{sp.rating ?? "—"}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>

			{tools.length > 0 && (
				<div>
					<h3 className="mb-2 font-medium text-sm">
						Standardised Tools Administered
					</h3>
					<ul className="list-inside list-disc text-on-surface-variant text-sm">
						{tools.map((t: any, i: number) => (
							<li key={i}>
								{t?.name ?? `Tool ${i + 1}`}
								{t?.scoreSummary ? ` — ${t.scoreSummary}` : ""}
							</li>
						))}
					</ul>
				</div>
			)}
		</section>
	);
}
