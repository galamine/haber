import type { GameResultSummary } from "@haber-final/api/lib/game-result-summary";
import { Badge } from "@haber-final/ui/components/badge";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";

import { GameResultCard } from "@/features/session/game-result/GameResultCard";
import { trpc } from "@/utils/trpc";

type SessionStatus =
	| "PENDING"
	| "IN_PROGRESS"
	| "COMPLETED"
	| "ABSENT"
	| "MANUALLY_CLOSED";

const STATUS_BADGE: Record<
	SessionStatus,
	{ variant: "warning" | "outline" | "success" | "destructive"; label: string }
> = {
	PENDING: { variant: "warning", label: "Pending" },
	IN_PROGRESS: { variant: "outline", label: "In Progress" },
	COMPLETED: { variant: "success", label: "Completed" },
	ABSENT: { variant: "outline", label: "Absent" },
	MANUALLY_CLOSED: { variant: "destructive", label: "Closed" },
};

type SessionListItem = {
	id: string;
	scheduledDate: Date;
	status: SessionStatus;
	gameAssignments: {
		id: string;
		resultSummary: GameResultSummary | null;
		scored: unknown;
		gameVersion: { game: { name: string } };
	}[];
};

export function SessionsTab({ planId }: { planId: string }) {
	const { data: sessions, isLoading } = useQuery(
		trpc.session.listForPlan.queryOptions({ planId }),
	);

	if (isLoading) {
		return <p className="text-on-surface-variant text-sm">Loading sessions…</p>;
	}

	const list = (sessions ?? []) as unknown as SessionListItem[];

	if (list.length === 0) {
		return (
			<p className="text-on-surface-variant text-sm">
				No sessions have been scheduled for this plan yet.
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			{list.map((session) => {
				const statusInfo = STATUS_BADGE[session.status] ?? STATUS_BADGE.PENDING;
				return (
					<div
						key={session.id}
						className="rounded-xl border border-surface-container-highest bg-surface-container-lowest p-4"
					>
						<div className="mb-3 flex items-center gap-2">
							<CalendarClock className="h-4 w-4 text-on-surface-variant" />
							<span className="font-medium text-on-surface text-sm">
								{new Date(session.scheduledDate).toLocaleDateString()}
							</span>
							<Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
						</div>
						{session.status === "COMPLETED" &&
						session.gameAssignments.length > 0 ? (
							<div className="grid gap-4 lg:grid-cols-2">
								{session.gameAssignments.map((assignment) => (
									<GameResultCard
										key={assignment.id}
										gameName={assignment.gameVersion.game.name}
										resultSummary={assignment.resultSummary}
										scored={assignment.scored}
									/>
								))}
							</div>
						) : (
							<p className="text-on-surface-variant text-xs">
								{session.gameAssignments
									.map((a) => a.gameVersion.game.name)
									.join(", ") || "No games assigned"}
							</p>
						)}
					</div>
				);
			})}
		</div>
	);
}
