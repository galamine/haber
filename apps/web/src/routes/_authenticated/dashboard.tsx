import { Badge } from "@haber-final/ui/components/badge";
import { Skeleton } from "@haber-final/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Calendar, TrendingUp, Users } from "lucide-react";
import { PlanAdherenceRing } from "@/features/dashboard/PlanAdherenceRing";
import { RoomUtilisationTable } from "@/features/dashboard/RoomUtilisationTable";
import { StatCard } from "@/features/dashboard/StatCard";
import { TherapistLoadTable } from "@/features/dashboard/TherapistLoadTable";
import { TopCategoriesChart } from "@/features/dashboard/TopCategoriesChart";
import { useAuthStore } from "@/stores/auth";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_authenticated/dashboard")({
	beforeLoad: () => {
		const role = useAuthStore.getState().role;
		if (role === "SUPER_ADMIN") {
			throw redirect({ to: "/platform/dashboard" });
		}
	},
	component: DashboardPage,
});

function DashboardPage() {
	const role = useAuthStore((s) => s.role);
	const isAdmin = role === "CLINIC_ADMIN";

	const { data, isLoading } = useQuery({
		...trpc.dashboard.clinicSummary.queryOptions(),
		enabled: isAdmin,
	});

	if (!isAdmin) {
		return (
			<div className="p-8">
				<h1 className="font-semibold text-2xl text-on-surface">Dashboard</h1>
				<p className="mt-2 text-on-surface-variant">
					Welcome back. More content coming soon.
				</p>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="space-y-6 p-8">
				<h1 className="font-semibold text-2xl text-on-surface">Dashboard</h1>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
					<Skeleton className="h-32" />
					<Skeleton className="h-32" />
					<Skeleton className="h-32" />
				</div>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<Skeleton className="h-64" />
					<Skeleton className="h-64" />
				</div>
			</div>
		);
	}

	if (!data) {
		return null;
	}

	return (
		<div className="space-y-6 p-8">
			<h1 className="font-semibold text-2xl text-on-surface">Dashboard</h1>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<StatCard
					title="Active Children"
					value={data.activeChildren}
					icon={Users}
				/>
				<StatCard
					title="Sessions Today"
					value={data.sessionsToday.total}
					icon={Calendar}
				>
					<div className="mt-2 flex gap-2">
						<Badge variant="outline">
							{data.sessionsToday.pending} pending
						</Badge>
						<Badge variant="outline">
							{data.sessionsToday.inProgress} in progress
						</Badge>
						<Badge variant="outline">
							{data.sessionsToday.completed} completed
						</Badge>
					</div>
				</StatCard>
				<StatCard
					title="Sessions This Week"
					value={data.sessionsThisWeek}
					icon={TrendingUp}
				/>
			</div>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<RoomUtilisationTable
					rooms={data.roomUtilisation.rooms}
					booked={data.roomUtilisation.booked}
					total={data.roomUtilisation.total}
				/>
				<TherapistLoadTable therapists={data.therapistLoad} />
			</div>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<PlanAdherenceRing rate={data.planAdherenceRate} />
				<TopCategoriesChart categories={data.topCategoriesByActivity} />
			</div>
		</div>
	);
}
