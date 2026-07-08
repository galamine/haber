import { Skeleton } from "@haber-final/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ProgressReportPage } from "@/features/progress-report/ProgressReportPage";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute(
	"/_authenticated/children/$childId/report",
)({
	component: ReportRoute,
});

function ReportRoute() {
	const { childId } = Route.useParams();
	const { data, isLoading } = useQuery(
		trpc.report.childProgress.queryOptions({ childId }),
	);

	if (isLoading) return <Skeleton className="m-8 h-96 w-full" />;
	if (!data) return <div className="p-8">Report not found.</div>;

	return <ProgressReportPage report={data} childId={childId} />;
}
