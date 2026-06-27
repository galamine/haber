import { cn } from "@haber-final/ui/lib/utils";

import { GOAL_STATUS_COLORS, GOAL_STATUS_LABELS } from "./constants";
import type { GoalProgressEntry } from "./types";

type GoalTimelineProps = {
	entries: GoalProgressEntry[];
};

function formatDate(date: Date) {
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(date));
}

export function GoalTimeline({ entries }: GoalTimelineProps) {
	if (entries.length === 0) {
		return (
			<div className="flex h-32 items-center justify-center rounded-xl border border-surface-container-highest bg-surface-container-lowest">
				<p className="text-on-surface-variant text-sm">No progress history.</p>
			</div>
		);
	}

	return (
		<div className="relative space-y-0">
			{entries.map((entry, index) => (
				<div key={entry.id} className="flex gap-4">
					<div className="flex flex-col items-center">
						<div
							className={cn(
								"flex h-8 w-8 items-center justify-center rounded-full font-medium text-xs",
								GOAL_STATUS_COLORS[entry.status],
							)}
						>
							{entry.attainmentPct}
						</div>
						{index < entries.length - 1 && (
							<div className="h-full w-0.5 bg-border" />
						)}
					</div>
					<div className="flex-1 pb-6">
						<div className="flex items-center gap-2">
							<span className="text-on-surface-variant text-xs">
								{formatDate(entry.recordedAt)}
							</span>
							<span
								className={cn(
									"rounded px-1.5 py-0.5 font-medium text-[10px]",
									GOAL_STATUS_COLORS[entry.status],
								)}
							>
								{GOAL_STATUS_LABELS[entry.status]}
							</span>
						</div>
						<p className="mt-1 text-on-surface text-sm">
							{entry.attainmentPct}% attainment
						</p>
						{entry.evidenceNotes && (
							<p className="mt-1 text-on-surface-variant text-sm">
								{entry.evidenceNotes}
							</p>
						)}
					</div>
				</div>
			))}
		</div>
	);
}
