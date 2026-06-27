import { Button } from "@haber-final/ui/components/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@haber-final/ui/components/tabs";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { usePlanData } from "@/features/plan/use-plan-data";
import { PlanHeader } from "@/features/plan/PlanHeader";
import { PlanLifecycleButtons } from "@/features/plan/PlanLifecycleButtons";
import { DurationAdvisory } from "@/features/plan/DurationAdvisory";
import { GameAssignmentsTable } from "@/features/plan/GameAssignmentsTable";
import { GoalSection } from "@/features/plan/GoalSection";
import { ModifyPlanSheet } from "@/features/plan/ModifyPlanSheet";
import { GameLibraryBrowserSheet } from "@/features/plan/GameLibraryBrowserSheet";
import { PlanDetailSkeleton } from "@/features/plan/skeletons/PlanDetailSkeleton";
import { GoalTabContent } from "@/features/goals/GoalTabContent";
import { trpc } from "@/utils/trpc";
import type { GoalWithLatestNote } from "@/features/goals/types";

export const Route = createFileRoute("/_authenticated/children/$childId/plans/$planId/")({
	component: PlanDetailPage,
});

function PlanDetailPage() {
	const { childId, planId } = Route.useParams();
	const navigate = useNavigate();
	const { child, plan, sessionDuration, goals, isLoading } = usePlanData({ childId, planId });

	const goalsWithLatestNote = useQuery({
		...(goals.data
			? {
					queryKey: ["goalProgressHistory", goals.data.map((g) => g.id)],
					queryFn: async () => {
						const results = await Promise.all(
							goals.data!.map(async (goal) => {
								const history = await trpc.goal.listProgressHistory.query({ goalId: goal.id });
								const latestNote = history.length > 0 ? history[history.length - 1]?.evidenceNotes ?? null : null;
								return { ...goal, latestNote } as GoalWithLatestNote;
							}),
						);
						return results;
					},
				}
			: { queryKey: ["unused"], queryFn: () => null as GoalWithLatestNote[] }),
		enabled: !!goals.data,
	});

	const [modifySheetOpen, setModifySheetOpen] = useState(false);
	const [addGameSheetOpen, setAddGameSheetOpen] = useState(false);

	const addGame = useMutation(trpc.plan.addGame.mutationOptions({
		onSuccess: () => {
			toast.success("Game added to plan");
			setAddGameSheetOpen(false);
			trpc.plan.get.invalidate({ planId });
			trpc.plan.checkSessionDuration.invalidate({ planId });
		},
		onError: (err) => toast.error(err.message),
	}));

	const removeGame = useMutation(trpc.plan.removeGame.mutationOptions({
		onSuccess: () => {
			toast.success("Game removed");
			trpc.plan.get.invalidate({ planId });
			trpc.plan.checkSessionDuration.invalidate({ planId });
		},
		onError: (err) => toast.error(err.message),
	}));

	if (isLoading) return <PlanDetailSkeleton />;
	if (!plan.data) return <div>Plan not found</div>;

	const planData = plan.data as {
		id: string;
		name: string;
		versionNumber: number;
		status: string;
		sessionDurationMinutes: number;
		startDate?: Date | string | null;
		projectedEndDate?: Date | string | null;
		gameAssignments: Array<{
			id: string;
			gameVersion: { game: { name: string }; versionNumber: string };
			durationSeconds: number | null;
			repetitions: number | null;
			frequencyPerWeek: number | null;
			appliesToPhase: string | null;
		}>;
		goals: Array<{
			id: string;
			description: string;
			horizon: "SHORT_TERM" | "LONG_TERM";
			targetAttainmentPct: number;
			currentAttainmentPct: number;
			status: "MET" | "IN_PROGRESS" | "NOT_MET" | "DISCONTINUED";
		}>;
	};
	const durationData = sessionDuration.data;

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-2 text-sm">
				<Button variant="ghost" size="sm" onClick={() => navigate({ to: "/children/$childId/plans", params: { childId } })}>
					<ArrowLeft className="h-4 w-4" />
					Back to Plans
				</Button>
				<span className="text-on-surface-variant">/</span>
				<span className="text-on-surface font-medium">Plan Details</span>
			</div>

			<PlanHeader plan={planData} childName={child.data?.fullName} />

			{durationData?.exceeds && (
				<DurationAdvisory
					totalMinutes={Math.round(durationData.totalSeconds / 60)}
					limitMinutes={Math.round(durationData.limitSeconds / 60)}
				/>
			)}

			<PlanLifecycleButtons
				plan={planData}
				onModify={() => setModifySheetOpen(true)}
			/>

			<Tabs defaultValue="overview">
				<TabsList className="grid w-full grid-cols-2">
					<TabsTrigger value="overview">Overview</TabsTrigger>
					<TabsTrigger value="goals">Goals</TabsTrigger>
				</TabsList>
				<TabsContent value="overview">
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
						<div className="lg:col-span-2">
							<GameAssignmentsTable
								assignments={planData.gameAssignments}
								onEdit={(id) => {}}
								onRemove={(id) => removeGame.mutate({ assignmentId: id })}
								onAddGame={() => setAddGameSheetOpen(true)}
							/>
						</div>
						<div>
							<GoalSection goals={planData.goals} />
						</div>
					</div>
				</TabsContent>
				<TabsContent value="goals">
					<GoalTabContent
						goals={goalsWithLatestNote.data ?? []}
						childId={childId}
						planId={planId}
						isLoading={goalsWithLatestNote.isLoading}
					/>
				</TabsContent>
			</Tabs>

			<ModifyPlanSheet
				open={modifySheetOpen}
				onOpenChange={setModifySheetOpen}
				plan={planData}
				onSuccess={(newPlanId) => navigate({ to: "/children/$childId/plans/$planId", params: { childId, planId: newPlanId } })}
			/>

			<GameLibraryBrowserSheet
				open={addGameSheetOpen}
				onOpenChange={setAddGameSheetOpen}
				onSelectGame={(gameVersionId) => addGame.mutate({ planId, gameVersionId })}
			/>
		</div>
	);
}
