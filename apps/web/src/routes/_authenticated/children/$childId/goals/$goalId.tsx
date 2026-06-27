import { Alert, AlertDescription } from "@haber-final/ui/components/alert";
import { Button } from "@haber-final/ui/components/button";
import { Skeleton } from "@haber-final/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft } from "lucide-react";
import {
	GOAL_HORIZON_COLORS,
	GOAL_STATUS_COLORS,
	GOAL_STATUS_LABELS,
} from "@/features/goals/constants";
import { GoalChart } from "@/features/goals/GoalChart";
import { GoalTimeline } from "@/features/goals/GoalTimeline";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute(
	"/_authenticated/children/$childId/goals/$goalId",
)({
	component: GoalDetailPage,
	validateSearch: (search: Record<string, unknown>) => {
		return {
			treatmentPlanId: search.treatmentPlanId as string,
		};
	},
});

function GoalDetailPage() {
	const { childId, goalId } = Route.useParams();
	const { treatmentPlanId } = Route.useSearch();
	const navigate = useNavigate();

	const { data: historyEntries, isLoading: historyLoading } = useQuery(
		trpc.goal.listProgressHistory.queryOptions({ goalId }),
	);

	const { data: allGoals, isLoading: goalsLoading } = useQuery(
		trpc.goal.list.queryOptions({ treatmentPlanId }),
	);

	const currentGoal = allGoals?.find((g) => g.id === goalId);
	const supersededByGoal = currentGoal?.supersededByGoalId
		? allGoals?.find((g) => g.id === currentGoal.supersededByGoalId)
		: null;

	if (goalsLoading) {
		return (
			<div className="space-y-6 p-8">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-64 w-full rounded-xl" />
			</div>
		);
	}

	if (!currentGoal) {
		return (
			<div className="p-8">
				<div className="mb-6 flex items-center gap-2 text-sm">
					<Button
						variant="ghost"
						size="sm"
						onClick={() =>
							navigate({ to: "/children/$childId/plans", params: { childId } })
						}
					>
						<ArrowLeft className="h-4 w-4" />
						Back
					</Button>
				</div>
				<div className="flex h-48 items-center justify-center rounded-xl border border-surface-container-highest bg-surface-container-lowest">
					<p className="text-on-surface-variant text-sm">Goal not found.</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6 p-8">
			<div className="flex items-center gap-2 text-sm">
				<Button
					variant="ghost"
					size="sm"
					onClick={() =>
						navigate({ to: "/children/$childId/plans", params: { childId } })
					}
				>
					<ArrowLeft className="h-4 w-4" />
					Back to Plans
				</Button>
				<span className="text-on-surface-variant">/</span>
				<span className="font-medium text-on-surface">Goal Details</span>
			</div>

			<div className="rounded-xl border border-surface-container-highest bg-surface-container-lowest p-6">
				<div className="flex flex-col gap-3">
					<div className="flex items-center gap-2">
						<span
							className={`whitespace-nowrap rounded px-2 py-0.5 font-medium text-[11px] ${GOAL_HORIZON_COLORS[currentGoal.horizon]}`}
						>
							{currentGoal.horizon === "SHORT_TERM"
								? "Short-term"
								: "Long-term"}
						</span>
						<span
							className={`whitespace-nowrap rounded px-2 py-0.5 font-medium text-[11px] ${GOAL_STATUS_COLORS[currentGoal.status]}`}
						>
							{GOAL_STATUS_LABELS[currentGoal.status]}
						</span>
					</div>
					<h1 className="font-semibold text-on-surface text-xl">
						{currentGoal.description}
					</h1>
					<p className="text-on-surface-variant text-sm">
						Target: {currentGoal.targetAttainmentPct}% | Current:{" "}
						{currentGoal.currentAttainmentPct}%
					</p>
				</div>
			</div>

			{supersededByGoal && (
				<Alert>
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>
						This goal has been superseded by{" "}
						<button
							type="button"
							className="underline hover:no-underline"
							onClick={() =>
								navigate({
									to: "/children/$childId/goals/$goalId",
									params: { childId, goalId: supersededByGoal.id },
								})
							}
						>
							{supersededByGoal.description}
						</button>
					</AlertDescription>
				</Alert>
			)}

			{historyLoading ? (
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<Skeleton className="h-64 rounded-xl" />
					<Skeleton className="h-64 rounded-xl" />
				</div>
			) : (
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<GoalChart entries={historyEntries ?? []} />
					<GoalTimeline entries={historyEntries ?? []} />
				</div>
			)}
		</div>
	);
}
