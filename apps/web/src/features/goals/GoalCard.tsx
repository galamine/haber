import { Button } from "@haber-final/ui/components/button";
import { Progress } from "@haber-final/ui/components/progress";
import { cn } from "@haber-final/ui/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { Eye } from "lucide-react";

import {
	GOAL_HORIZON_COLORS,
	GOAL_STATUS_COLORS,
	GOAL_STATUS_LABELS,
} from "./constants";
import type { GoalWithLatestNote } from "./types";

type GoalCardProps = {
	goal: GoalWithLatestNote;
	childId: string;
};

export function GoalCard({ goal, childId }: GoalCardProps) {
	const navigate = useNavigate();
	const isDiscontinued = goal.status === "DISCONTINUED";
	const progressPct =
		(goal.currentAttainmentPct / goal.targetAttainmentPct) * 100;

	return (
		<div
			className={cn(
				"flex flex-col gap-3 rounded-xl border p-4 transition-colors",
				isDiscontinued
					? "border-surface-container-highest bg-surface-container-lowest opacity-60"
					: "border-surface-container-highest bg-surface-container-lowest",
			)}
		>
			<div className="flex items-start justify-between gap-3">
				<div className="flex flex-1 flex-col gap-1.5">
					<div className="flex items-center gap-2">
						<span
							className={cn(
								"whitespace-nowrap rounded px-2 py-0.5 font-medium text-[11px]",
								GOAL_HORIZON_COLORS[goal.horizon],
							)}
						>
							{goal.horizon === "SHORT_TERM" ? "Short-term" : "Long-term"}
						</span>
						<span
							className={cn(
								"whitespace-nowrap rounded px-2 py-0.5 font-medium text-[11px]",
								GOAL_STATUS_COLORS[goal.status],
							)}
						>
							{GOAL_STATUS_LABELS[goal.status]}
						</span>
					</div>
					<p
						className={cn(
							"font-medium text-sm",
							isDiscontinued && "text-on-surface-variant line-through",
							!isDiscontinued && "text-on-surface",
						)}
					>
						{goal.description}
					</p>
				</div>
			</div>

			<Progress value={progressPct} className="h-2" />

			<div className="flex items-center justify-between text-xs">
				<div className="flex gap-4 text-on-surface-variant">
					<span>Target: {goal.targetAttainmentPct}%</span>
					<span>Current: {goal.currentAttainmentPct}%</span>
				</div>
				{goal.latestNote && (
					<p className="max-w-[200px] truncate text-on-surface-variant">
						{goal.latestNote}
					</p>
				)}
			</div>

			<Button
				variant="outline"
				size="sm"
				className="mt-1 w-full gap-1.5"
				onClick={() =>
					navigate({
						to: "/children/$childId/goals/$goalId",
						params: { childId, goalId: goal.id },
						search: { treatmentPlanId: goal.treatmentPlanId },
					})
				}
			>
				<Eye className="h-3.5 w-3.5" />
				View history
			</Button>
		</div>
	);
}
