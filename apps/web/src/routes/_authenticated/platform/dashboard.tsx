import { Skeleton } from "@haber-final/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Building2, Calendar, Gamepad2, TrendingUp, Users } from "lucide-react";
import { PlatformClinicsTable } from "@/features/dashboard/PlatformClinicsTable";
import { StatCard } from "@/features/dashboard/StatCard";
import { useAuthStore } from "@/stores/auth";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_authenticated/platform/dashboard")({
	beforeLoad: () => {
		if (useAuthStore.getState().role !== "SUPER_ADMIN") {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: PlatformDashboardPage,
});

function PlatformDashboardPage() {
	const { data, isLoading } = useQuery(
		trpc.clinic.platformSummary.queryOptions(),
	);
	const { data: gameCatalog, isLoading: gameCatalogLoading } = useQuery(
		trpc.game.catalogSummary.queryOptions(),
	);

	if (isLoading || gameCatalogLoading) {
		return (
			<div className="space-y-6 p-8">
				<h1 className="font-semibold text-2xl text-on-surface">
					Platform Dashboard
				</h1>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-5">
					<Skeleton className="h-32" />
					<Skeleton className="h-32" />
					<Skeleton className="h-32" />
					<Skeleton className="h-32" />
					<Skeleton className="h-32" />
				</div>
				<Skeleton className="h-96" />
			</div>
		);
	}

	if (!data) {
		return null;
	}

	return (
		<div className="space-y-6 p-8">
			<h1 className="font-semibold text-2xl text-on-surface">
				Platform Dashboard
			</h1>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-5">
				<StatCard
					title="Total Clinics"
					value={data.clinicData.length}
					icon={Building2}
				/>
				<StatCard
					title="Active Children"
					value={data.totalChildren}
					icon={Users}
				/>
				<StatCard
					title="Sessions This Month"
					value={data.totalSessionsThisMonth}
					icon={Calendar}
				/>
				<StatCard
					title="New Clinics This Month"
					value={data.newClinicsThisMonth}
					icon={TrendingUp}
				/>
				{gameCatalog && (
					<StatCard
						title="Game Catalog"
						value={gameCatalog.totalGames}
						subtitle={`${gameCatalog.totalCategories} categories, ${gameCatalog.deprecatedVersionCount} deprecated versions`}
						icon={Gamepad2}
					/>
				)}
			</div>
			<PlatformClinicsTable data={data.clinicData} />
		</div>
	);
}
