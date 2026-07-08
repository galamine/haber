type Props = { report: any };

export function ReportSummary({ report }: Props) {
	const { activePlan, sessions, assignedTherapists } = report;

	const totalSessions = sessions?.length ?? 0;
	const completedSessions =
		sessions?.filter((s: any) => s.status === "COMPLETED").length ?? 0;
	const attendancePct =
		totalSessions > 0
			? Math.round((completedSessions / totalSessions) * 100)
			: null;

	return (
		<section>
			<h2 className="mb-4 font-medium text-display-xs">Summary</h2>
			<dl className="grid grid-cols-2 gap-4 text-sm">
				{activePlan && (
					<>
						<div>
							<dt className="text-on-surface-variant">Active Plan</dt>
							<dd className="font-medium">{activePlan.name}</dd>
						</div>
						<div>
							<dt className="text-on-surface-variant">Plan Status</dt>
							<dd className="font-medium">
								{activePlan.status?.replace("_", " ")}
							</dd>
						</div>
						{activePlan.startDate && (
							<div>
								<dt className="text-on-surface-variant">Start Date</dt>
								<dd className="font-medium">
									{new Date(activePlan.startDate).toLocaleDateString()}
								</dd>
							</div>
						)}
						{activePlan.projectedEndDate && (
							<div>
								<dt className="text-on-surface-variant">Projected End</dt>
								<dd className="font-medium">
									{new Date(activePlan.projectedEndDate).toLocaleDateString()}
								</dd>
							</div>
						)}
					</>
				)}
				<div>
					<dt className="text-on-surface-variant">Assigned Therapists</dt>
					<dd className="font-medium">
						{assignedTherapists?.join(", ") || "—"}
					</dd>
				</div>
				{attendancePct !== null && (
					<div>
						<dt className="text-on-surface-variant">Attendance</dt>
						<dd className="font-medium">{attendancePct}%</dd>
					</div>
				)}
			</dl>
		</section>
	);
}
