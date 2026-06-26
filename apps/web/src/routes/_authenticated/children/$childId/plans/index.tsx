import { Button } from "@haber-final/ui/components/button";
import { useNavigate, createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import { usePlanData } from "@/features/plan/use-plan-data";
import { PlanListSkeleton } from "@/features/plan/skeletons/PlanListSkeleton";
import { PLAN_STATUS_COLORS } from "@/features/plan/constants";
import { cn } from "@haber-final/ui/lib/utils";

export const Route = createFileRoute("/_authenticated/children/$childId/plans/")({
	component: PlansListPage,
});

function PlansListPage() {
	const { childId } = Route.useParams();
	const navigate = useNavigate();
	const { plans, activePlans, isLoading } = usePlanData({ childId });

	const groupedPlans = useMemo(() => {
		if (!plans.data) return [];

		const groups: Record<string, { name: string; versions: Array<{ id: string; name: string; versionNumber: number; status: string; isActive: boolean }> }> = {};

		for (const plan of plans.data) {
			const name = plan.name;
			if (!groups[name]) {
				groups[name] = { name, versions: [] };
			}
			groups[name].versions.push({
				id: plan.id,
				name: plan.name,
				versionNumber: plan.versionNumber,
				status: plan.status,
				isActive: plan.isActive,
			});
		}

		return Object.values(groups);
	}, [plans.data]);

	const activePlanIds = new Set(activePlans.data?.map(p => p.id) ?? []);

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<h1 className="font-bold text-on-background">Treatment Plans</h1>
				<Button onClick={() => navigate({ to: "/children/$childId/plans/new", params: { childId } })}>
					<span className="material-symbols-outlined">add</span>
					New Plan
				</Button>
			</div>

			{isLoading ? (
				<PlanListSkeleton />
			) : plans.data?.length === 0 ? (
				<div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center text-on-surface-variant">
					No treatment plans yet. Create one to get started.
				</div>
			) : (
				<div className="space-y-4">
					{groupedPlans.map(group => (
						<div key={group.name} className="bg-surface-container-low rounded-xl border border-outline-variant p-4">
							<div className="flex justify-between items-center border-b border-outline-variant pb-3 mb-3">
								<h3 className="font-semibold text-brown-800">{group.name}</h3>
								<span className="text-xs bg-surface-container px-2 py-1 rounded text-on-surface-variant border border-outline-variant">
									{group.versions.length} Version{group.versions.length !== 1 ? "s" : ""}
								</span>
							</div>
							<div className="flex flex-col gap-2">
								{group.versions.map(version => (
									<button
										key={version.id}
										onClick={() => navigate({ to: "/children/$childId/plans/$planId", params: { childId, planId: version.id } })}
										className={cn(
											"flex items-center justify-between p-3 rounded-lg border transition-all hover:shadow-md text-left",
											version.isActive
												? "bg-[#dcfce7] border-[#bbf7d0]"
												: "bg-surface-container-lowest border-outline-variant hover:border-brown-400",
										)}
									>
										<div className="flex items-center gap-3">
											<span className="material-symbols-outlined text-on-surface-variant">
												{version.isActive ? "check_circle" : "description"}
											</span>
											<span className="text-sm font-medium text-on-surface">
												Version {version.versionNumber}
											</span>
											<span className={cn("px-2 py-0.5 rounded text-xs font-medium", PLAN_STATUS_COLORS[version.status])}>
												{version.status}
											</span>
										</div>
										<span className="material-symbols-outlined text-on-surface-variant text-lg">chevron_right</span>
									</button>
								))}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
