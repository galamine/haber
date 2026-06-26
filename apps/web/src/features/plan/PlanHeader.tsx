import { cn } from "@haber-final/ui/lib/utils";
import { PLAN_STATUS_COLORS, PLAN_STATUS_LABELS } from "./constants";

function formatDate(date: Date | string | null | undefined): string {
	if (!date) return "";
	return new Date(date).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

type PlanHeaderProps = {
	plan: {
		name: string;
		versionNumber: number;
		status: string;
		sessionDurationMinutes: number;
		startDate?: Date | string | null;
		projectedEndDate?: Date | string | null;
	};
	childName?: string;
};

export function PlanHeader({ plan, childName }: PlanHeaderProps) {
	const statusClass =
		PLAN_STATUS_COLORS[plan.status] ?? PLAN_STATUS_COLORS.DRAFT;

	return (
		<section className="rounded-xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-sm">
			<div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
				<div className="flex-1">
					<div className="mb-1 flex items-center gap-3">
						<h1 className="font-bold text-on-surface tracking-tight">
							{plan.name}
						</h1>
						<span className="rounded border border-outline-variant bg-surface-container-highest px-2 py-0.5 font-medium text-on-surface text-xs">
							v{plan.versionNumber}.0
						</span>
						<span
							className={cn(
								"rounded-full border px-2 py-0.5 font-medium text-xs",
								statusClass,
							)}
						>
							{PLAN_STATUS_LABELS[plan.status]}
						</span>
					</div>
					{childName && (
						<p className="mb-3 text-on-surface-variant text-sm">
							<span className="material-symbols-outlined align-middle text-sm">
								child_care
							</span>{" "}
							{childName}
						</p>
					)}
					<div className="flex flex-wrap gap-x-6 gap-y-2">
						<div className="flex items-center gap-2 text-on-surface-variant text-sm">
							<span className="material-symbols-outlined text-base">timer</span>
							<span>
								Session Target:{" "}
								<strong className="font-medium text-on-surface">
									{plan.sessionDurationMinutes}m
								</strong>
							</span>
						</div>
						{plan.startDate && (
							<div className="flex items-center gap-2 text-on-surface-variant text-sm">
								<span className="material-symbols-outlined text-base">
									calendar_today
								</span>
								<span>
									Start:{" "}
									<strong className="font-medium text-on-surface">
										{formatDate(plan.startDate)}
									</strong>
								</span>
							</div>
						)}
						{plan.projectedEndDate && (
							<div className="flex items-center gap-2 text-on-surface-variant text-sm">
								<span className="material-symbols-outlined text-base">
									event_busy
								</span>
								<span>
									Review:{" "}
									<strong className="font-medium text-on-surface">
										{formatDate(plan.projectedEndDate)}
									</strong>
								</span>
							</div>
						)}
					</div>
				</div>
			</div>
		</section>
	);
}
