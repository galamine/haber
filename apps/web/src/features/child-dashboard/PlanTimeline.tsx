import type { TreatmentPlan } from "@haber-final/db";
import { Card } from "@haber-final/ui/components/card";

type PlanEntry = Pick<
	TreatmentPlan,
	"id" | "name" | "versionNumber" | "isActive" | "status" | "createdAt"
>;

type PlanTimelineProps = {
	plans: PlanEntry[];
};

function formatDate(date: Date) {
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(date));
}

export function PlanTimeline({ plans }: PlanTimelineProps) {
	if (!plans || plans.length === 0) {
		return (
			<Card className="p-5">
				<h3 className="mb-4 font-medium text-on-surface">Plan Timeline</h3>
				<div className="flex h-32 items-center justify-center rounded-xl border border-surface-container-highest bg-surface-container-lowest">
					<p className="text-on-surface-variant text-sm">
						No treatment plans found.
					</p>
				</div>
			</Card>
		);
	}

	return (
		<Card className="p-5">
			<h3 className="mb-4 font-medium text-on-surface">Plan Timeline</h3>
			<div className="flex items-center gap-4 overflow-x-auto py-4">
				{plans.map((plan) => (
					<div
						key={plan.id}
						className="flex min-w-[120px] flex-col items-center"
					>
						<div
							className={`h-3 w-3 rounded-full ${
								plan.isActive ? "bg-chart-1" : "bg-gray-300"
							}`}
						/>
						<p className="mt-2 text-center font-medium text-on-surface text-xs">
							{plan.name}
						</p>
						<p className="text-on-surface-variant text-xs">
							v{plan.versionNumber}
						</p>
						<p className="text-on-surface-variant text-xs">
							{formatDate(new Date(plan.createdAt))}
						</p>
						{plan.isActive && (
							<span className="mt-1 rounded bg-chart-1/20 px-1.5 py-0.5 font-medium text-[10px] text-chart-1">
								Active
							</span>
						)}
					</div>
				))}
			</div>
		</Card>
	);
}
