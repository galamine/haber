import { Button } from "@haber-final/ui/components/button";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Printer } from "lucide-react";
import type { trpc } from "@/utils/trpc";
import { AssessmentSummary } from "./AssessmentSummary";
import { FollowUpNotes } from "./FollowUpNotes";
import { GoalProgress } from "./GoalProgress";
import { ReportCover } from "./ReportCover";
import { ReportSummary } from "./ReportSummary";
import { SensoryProgress } from "./SensoryProgress";
import { SessionSummary } from "./SessionSummary";
import { Signatures } from "./Signatures";

type Props = {
	report: Awaited<
		ReturnType<typeof trpc.report.childProgress.queryOptions>
	> extends Promise<infer T>
		? T
		: never;
	childId: string;
};

export function ProgressReportPage({ report, childId }: Props) {
	const handlePrint = () => window.print();

	return (
		<div className="p-8">
			<div className="no-print mb-6 flex items-center justify-between">
				<Link
					to="/children/$childId/dashboard"
					params={{ childId }}
					className="inline-flex items-center gap-1.5 text-on-surface-variant text-sm hover:text-on-surface"
				>
					<ArrowLeft className="h-4 w-4" />
					Back to Dashboard
				</Link>
				<Button onClick={handlePrint} className="gap-2">
					<Printer className="h-4 w-4" />
					Open Print View
				</Button>
			</div>

			<div className="mx-auto max-w-3xl space-y-8">
				<ReportCover report={report} clinic={report.child.clinic} />
				<ReportSummary report={report} />
				<AssessmentSummary report={report} />
				<GoalProgress goals={report.goals} />
				<SensoryProgress
					assessments={report.assessments}
					followUps={report.followUps}
				/>
				<SessionSummary sessions={report.sessions} />
				<FollowUpNotes followUps={report.followUps} />
				<Signatures />
			</div>
		</div>
	);
}
