import { Skeleton } from "@haber-final/ui/components/skeleton";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

import { GoalCard } from "./GoalCard";
import type { GoalWithLatestNote } from "./types";

type GoalTabContentProps = {
	goals: GoalWithLatestNote[];
	childId: string;
	planId: string;
	isLoading: boolean;
};

export function GoalTabContent({
	goals,
	childId,
	planId,
	isLoading,
}: GoalTabContentProps) {
	const [showDiscontinued, setShowDiscontinued] = useState(false);

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div className="space-y-3">
					<Skeleton className="h-5 w-32" />
					<div className="grid gap-4 sm:grid-cols-2">
						{[1, 2, 3].map((i) => (
							<Skeleton key={i} className="h-40 rounded-xl" />
						))}
					</div>
				</div>
				<div className="space-y-3">
					<Skeleton className="h-5 w-32" />
					<div className="grid gap-4 sm:grid-cols-2">
						{[1, 2].map((i) => (
							<Skeleton key={i} className="h-40 rounded-xl" />
						))}
					</div>
				</div>
			</div>
		);
	}

	const shortTermGoals = goals.filter(
		(g) => g.horizon === "SHORT_TERM" && g.status !== "DISCONTINUED",
	);
	const longTermGoals = goals.filter(
		(g) => g.horizon === "LONG_TERM" && g.status !== "DISCONTINUED",
	);
	const discontinuedGoals = goals.filter((g) => g.status === "DISCONTINUED");

	if (goals.length === 0) {
		return (
			<div className="flex h-48 items-center justify-center rounded-xl border border-surface-container-highest bg-surface-container-lowest">
				<p className="text-on-surface-variant text-sm">No goals configured.</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="space-y-3">
				<h3 className="font-medium text-on-surface text-sm">
					Short-term Goals
				</h3>
				{shortTermGoals.length === 0 ? (
					<p className="py-4 text-center text-on-surface-variant text-sm">
						No short-term goals.
					</p>
				) : (
					<div className="grid gap-4 sm:grid-cols-2">
						{shortTermGoals.map((goal) => (
							<GoalCard key={goal.id} goal={goal} childId={childId} />
						))}
					</div>
				)}
			</div>

			<div className="space-y-3">
				<h3 className="font-medium text-on-surface text-sm">Long-term Goals</h3>
				{longTermGoals.length === 0 ? (
					<p className="py-4 text-center text-on-surface-variant text-sm">
						No long-term goals.
					</p>
				) : (
					<div className="grid gap-4 sm:grid-cols-2">
						{longTermGoals.map((goal) => (
							<GoalCard key={goal.id} goal={goal} childId={childId} />
						))}
					</div>
				)}
			</div>

			{discontinuedGoals.length > 0 && (
				<div className="space-y-3">
					<button
						type="button"
						className="flex items-center gap-2 text-on-surface-variant text-sm hover:text-on-surface"
						onClick={() => setShowDiscontinued(!showDiscontinued)}
					>
						{showDiscontinued ? (
							<ChevronUp className="h-4 w-4" />
						) : (
							<ChevronDown className="h-4 w-4" />
						)}
						Discontinued ({discontinuedGoals.length})
					</button>
					{showDiscontinued && (
						<div className="grid gap-4 sm:grid-cols-2">
							{discontinuedGoals.map((goal) => (
								<GoalCard key={goal.id} goal={goal} childId={childId} />
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
