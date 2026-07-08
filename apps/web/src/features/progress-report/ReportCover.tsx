import { Stethoscope } from "lucide-react";

type Props = { report: any };

export function ReportCover({ report }: Props) {
	const { child } = report;
	const dob = new Date(child.dob);
	const age = Math.floor(
		(Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
	);

	return (
		<div className="print-page-break">
			<div className="mb-8 flex items-center gap-3">
				<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brown-600">
					<Stethoscope className="h-6 w-6 text-white" />
				</div>
				<div className="flex flex-col">
					<span className="font-black text-brown-800 text-lg leading-tight">
						HaberApp
					</span>
					<span className="text-on-surface-variant text-xs tracking-wide">
						Clinical Excellence
					</span>
				</div>
			</div>

			<h1 className="mb-2 text-center font-medium text-display-md">
				Progress Report
			</h1>
			<p className="mb-8 text-center text-on-surface-variant">
				{child.fullName} · {age} yrs · OP#{child.opNumber}
			</p>

			<div className="grid grid-cols-2 gap-4 text-sm">
				<div>
					<p className="text-on-surface-variant">Report Date</p>
					<p className="font-medium">{new Date().toLocaleDateString()}</p>
				</div>
				<div>
					<p className="text-on-surface-variant">Clinic</p>
					<p className="font-medium">Haber Clinic</p>
				</div>
			</div>
		</div>
	);
}
