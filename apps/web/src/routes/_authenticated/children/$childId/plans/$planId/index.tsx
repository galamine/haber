import { Alert, AlertDescription } from "@haber-final/ui/components/alert";
import { Button } from "@haber-final/ui/components/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@haber-final/ui/components/tabs";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft } from "lucide-react";

import { usePlanData } from "@/features/plan/use-plan-data";
import { PlanHeader } from "@/features/plan/PlanHeader";
import { PlanLifecycleButtons } from "@/features/plan/PlanLifecycleButtons";
import { GoalSection } from "@/features/plan/GoalSection";
import { PlanDetailSkeleton } from "@/features/plan/skeletons/PlanDetailSkeleton";
import { GoalTabContent } from "@/features/goals/GoalTabContent";
import { SessionsTab } from "@/features/plan/SessionsTab";
import { trpcClient } from "@/utils/trpc";
import type { GoalWithLatestNote } from "@/features/goals/types";

export const Route = createFileRoute("/_authenticated/children/$childId/plans/$planId/")({
	component: PlanDetailPage,
});

function PlanDetailPage() {
	const { childId, planId } = Route.useParams();
	const navigate = useNavigate();
	const { child, plan, goals, isLoading } = usePlanData({ childId, planId });

	const goalsWithLatestNote = useQuery({
		...(goals.data
			? {
					queryKey: ["goalProgressHistory", goals.data.map((g) => g.id)],
					queryFn: async () => {
						const results = await Promise.all(
							goals.data!.map(async (goal) => {
								const history = await trpcClient.goal.listProgressHistory.query({ goalId: goal.id });
								const latestNote = history.length > 0 ? history[history.length - 1]?.evidenceNotes ?? null : null;
								return { ...goal, latestNote } as GoalWithLatestNote;
							}),
						);
						return results;
					},
				}
			: { queryKey: ["unused"], queryFn: () => [] as GoalWithLatestNote[] }),
		enabled: !!goals.data,
	});

	if (isLoading) return <PlanDetailSkeleton />;
	if (plan.isError) {
		return (
			<div className="p-8">
				<div className="mb-6 flex items-center gap-2 text-sm">
					<Button
						variant="ghost"
						size="sm"
						onClick={() =>
							navigate({
								to: "/children/$childId/plans",
								params: { childId },
							})
						}
					>
						<ArrowLeft className="h-4 w-4" />
						Back to Plans
					</Button>
				</div>
				<Alert variant="destructive">
					<AlertCircle />
					<AlertDescription>{plan.error.message}</AlertDescription>
				</Alert>
			</div>
		);
	}
	if (!plan.data) return <div>Plan not found</div>;

	const planData = plan.data as {
		id: string;
		name: string;
		versionNumber: number;
		status: string;
		sessionDurationMinutes: number;
		startDate?: Date | string | null;
		projectedEndDate?: Date | string | null;
	};

	return (
		<div className="space-y-6 p-8">
			<div className="flex items-center gap-2 text-sm">
				<Button variant="ghost" size="sm" onClick={() => navigate({ to: "/children/$childId/plans", params: { childId } })}>
					<ArrowLeft className="h-4 w-4" />
					Back to Plans
				</Button>
				<span className="text-on-surface-variant">/</span>
				<span className="text-on-surface font-medium">Plan Details</span>
			</div>

			<PlanHeader plan={planData} childName={child.data?.fullName} />

			<PlanLifecycleButtons plan={planData} />

			<Tabs defaultValue="overview">
				<TabsList className="grid w-full grid-cols-3">
					<TabsTrigger value="overview">Overview</TabsTrigger>
					<TabsTrigger value="goals">Goals</TabsTrigger>
					<TabsTrigger value="sessions">Sessions</TabsTrigger>
				</TabsList>
				<TabsContent value="overview" className="pt-6">
					<GoalSection goals={goals.data} />
				</TabsContent>
				<TabsContent value="goals" className="pt-6">
					<GoalTabContent
						goals={goalsWithLatestNote.data ?? []}
						childId={childId}
						planId={planId}
						isLoading={goalsWithLatestNote.isLoading}
					/>
				</TabsContent>
				<TabsContent value="sessions" className="pt-6">
					<SessionsTab
						scope="plan"
						planId={planId}
						childId={childId}
						planStatus={planData.status}
						defaultDurationMinutes={planData.sessionDurationMinutes}
					/>
				</TabsContent>
			</Tabs>
		</div>
	);
}

