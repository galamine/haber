import { Button } from "@haber-final/ui/components/button";
import { Skeleton } from "@haber-final/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Printer } from "lucide-react";
import { useState } from "react";
import { GameScoreTrendChart } from "@/features/child-dashboard/GameScoreTrendChart";
import { MilestoneRadarChart } from "@/features/child-dashboard/MilestoneRadarChart";
import { NotesTimeline } from "@/features/child-dashboard/NotesTimeline";
import { PlanTimeline } from "@/features/child-dashboard/PlanTimeline";
import { SensoryTrendChart } from "@/features/child-dashboard/SensoryTrendChart";
import { SessionCalendar } from "@/features/child-dashboard/SessionCalendar";
import { SnapshotCard } from "@/features/child-dashboard/SnapshotCard";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute(
	"/_authenticated/children/$childId/dashboard",
)({
	component: ChildDashboardPage,
});

function ProfileSkeleton() {
	return (
		<div className="p-8">
			<Skeleton className="mb-6 h-6 w-24" />
			<div className="mb-6 flex items-center gap-4">
				<Skeleton className="h-14 w-14 rounded-full" />
				<div className="space-y-2">
					<Skeleton className="h-6 w-48" />
					<Skeleton className="h-4 w-32" />
				</div>
			</div>
			<div className="grid gap-6 lg:grid-cols-3">
				<Skeleton className="h-64 w-full rounded-xl lg:col-span-2" />
				<Skeleton className="h-64 w-full rounded-xl" />
			</div>
		</div>
	);
}

function ChildDashboardPage() {
	const { childId } = Route.useParams();
	const now = new Date();
	const [month, setMonth] = useState(now.getMonth() + 1);
	const [year, setYear] = useState(now.getFullYear());

	const { data: snapshot, isLoading: snapshotLoading } = useQuery(
		trpc.dashboard.childSnapshot.queryOptions({ childId }),
	);
	const { data: child, isLoading: childLoading } = useQuery(
		trpc.child.get.queryOptions({ childId }),
	);
	const { data: milestones, isLoading: milestonesLoading } = useQuery(
		trpc.dashboard.milestoneRadar.queryOptions({ childId }),
	);
	const { data: sensory, isLoading: sensoryLoading } = useQuery(
		trpc.dashboard.sensoryDeltaHistory.queryOptions({ childId }),
	);
	const { data: gameScores, isLoading: gameScoresLoading } = useQuery(
		trpc.dashboard.gameScoreTrends.queryOptions({ childId }),
	);
	const { data: calendar, isLoading: calendarLoading } = useQuery(
		trpc.dashboard.sessionCalendar.queryOptions({ childId, month, year }),
	);
	const { data: notes, isLoading: notesLoading } = useQuery(
		trpc.dashboard.notesTimeline.queryOptions({ childId }),
	);
	const { data: plans, isLoading: plansLoading } = useQuery(
		trpc.plan.list.queryOptions({ childId }),
	);

	const isLoading =
		snapshotLoading ||
		childLoading ||
		milestonesLoading ||
		sensoryLoading ||
		gameScoresLoading ||
		notesLoading ||
		plansLoading;

	if (isLoading) {
		return <ProfileSkeleton />;
	}

	if (!snapshot) {
		return (
			<div className="flex flex-col items-center justify-center gap-3 py-32 text-on-surface-variant">
				<p className="text-sm">Unable to load dashboard.</p>
				<Button variant="outline" onClick={() => window.history.back()}>
					Go Back
				</Button>
			</div>
		);
	}

	const handleMonthChange = (newMonth: number, newYear: number) => {
		setMonth(newMonth);
		setYear(newYear);
	};

	return (
		<div className="p-8">
			<Link
				to="/children/$childId/"
				params={{ childId }}
				className="mb-6 inline-flex items-center gap-1.5 text-on-surface-variant text-sm hover:text-on-surface"
			>
				<ArrowLeft className="h-4 w-4" />
				Back to Profile
			</Link>

			<div className="space-y-6">
				<SnapshotCard
					name={snapshot.name}
					age={snapshot.age}
					opNumber={snapshot.opNumber}
					activePlan={snapshot.activePlan}
					nextSession={snapshot.nextSession}
					attendancePct={snapshot.attendancePct}
					photoUrl={child?.photoUrl}
				/>

				<div className="mb-4 flex justify-end">
					<Button variant="outline" asChild>
						<Link
							to="/children/$childId/report"
							params={{ childId }}
							className="gap-2"
						>
							<Printer className="h-4 w-4" />
							Export Report
						</Link>
					</Button>
				</div>

				<div className="grid gap-6 lg:grid-cols-3">
					<div className="space-y-6 lg:col-span-2">
						<MilestoneRadarChart data={milestones ?? []} />
						<SensoryTrendChart data={sensory ?? []} />
						<GameScoreTrendChart data={gameScores ?? []} />
					</div>

					<div className="space-y-6">
						<SessionCalendar
							data={calendar ?? {}}
							month={month}
							year={year}
							onMonthChange={handleMonthChange}
						/>
						<NotesTimeline data={notes ?? []} />
					</div>
				</div>

				<PlanTimeline plans={plans ?? []} />
			</div>
		</div>
	);
}
