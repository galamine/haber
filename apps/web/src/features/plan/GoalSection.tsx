import { Progress } from "@haber-final/ui/components/progress";
import { cn } from "@haber-final/ui/lib/utils";

type Goal = {
	id: string;
	description: string;
	horizon: "SHORT_TERM" | "LONG_TERM";
	targetAttainmentPct: number;
	currentAttainmentPct: number;
	status: "MET" | "IN_PROGRESS" | "NOT_MET" | "DISCONTINUED";
};

type GoalSectionProps = {
	goals?: Goal[];
};

const STATUS_COLORS: Record<string, string> = {
	MET: "bg-[#dcfce7] text-[#15803d]",
	IN_PROGRESS: "bg-[#e0e7ff] text-[#4338ca]",
	NOT_MET: "bg-red-100 text-red-700",
	DISCONTINUED: "bg-surface-container text-on-surface-variant",
};

export function GoalSection({ goals = [] }: GoalSectionProps) {
	const activeGoals = goals.filter((g) => g.status !== "DISCONTINUED");

	return (
		<div className="h-full rounded-xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-sm">
			<div className="mb-4 flex items-center justify-between">
				<h2 className="flex items-center gap-2 font-medium text-on-surface">
					<span className="material-symbols-outlined text-primary">flag</span>
					Clinical Goals
				</h2>
				<span className="rounded bg-surface-container px-2 py-1 text-on-surface-variant text-xs">
					{activeGoals.length} Active
				</span>
			</div>
			<div className="flex flex-col gap-4">
				{goals.length === 0 ? (
					<p className="py-4 text-center text-on-surface-variant text-sm">
						No goals configured.
					</p>
				) : (
					goals.map((goal) => (
						<div key={goal.id} className="flex flex-col gap-2">
							<div className="flex items-start justify-between gap-3">
								<p
									className={cn(
										"font-medium text-sm",
										goal.status === "DISCONTINUED" &&
											"text-on-surface-variant line-through",
									)}
								>
									{goal.description}
								</p>
								<span
									className={cn(
										"whitespace-nowrap rounded px-2 py-0.5 font-medium text-[11px]",
										STATUS_COLORS[goal.status],
									)}
								>
									{goal.status.replace("_", " ")}
								</span>
							</div>
							<Progress
								value={
									(goal.currentAttainmentPct / goal.targetAttainmentPct) * 100
								}
								className="h-2"
							/>
							<div className="flex justify-between text-on-surface-variant text-xs">
								<span>Target: {goal.targetAttainmentPct}%</span>
								<span>Current: {goal.currentAttainmentPct}%</span>
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
}
