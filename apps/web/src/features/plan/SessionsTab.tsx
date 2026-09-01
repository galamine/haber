import type { GameResultSummary } from "@haber-final/api/lib/game-result-summary";
import { Badge } from "@haber-final/ui/components/badge";
import { Button } from "@haber-final/ui/components/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@haber-final/ui/components/table";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { CalendarClock, PlusCircle } from "lucide-react";
import { useState } from "react";

import { CreateSessionSheet } from "@/features/session/CreateSessionSheet";
import { GameResultCard } from "@/features/session/game-result/GameResultCard";
import { summarizeFamilyStats } from "@/features/session/summarize-family-stats";
import { trpc } from "@/utils/trpc";

type SessionStatus =
	| "PENDING"
	| "IN_PROGRESS"
	| "COMPLETED"
	| "ABSENT"
	| "MANUALLY_CLOSED"
	| "TIMED_OUT";

const STATUS_BADGE: Record<
	SessionStatus,
	{ variant: "warning" | "outline" | "success" | "destructive"; label: string }
> = {
	PENDING: { variant: "warning", label: "Pending" },
	IN_PROGRESS: { variant: "outline", label: "In Progress" },
	COMPLETED: { variant: "success", label: "Completed" },
	ABSENT: { variant: "outline", label: "Absent" },
	MANUALLY_CLOSED: { variant: "destructive", label: "Closed" },
	TIMED_OUT: { variant: "destructive", label: "Timed Out" },
};

type SessionListItem = {
	id: string;
	scheduledDate: Date;
	status: SessionStatus;
	gameAssignments: {
		id: string;
		resultSummary: GameResultSummary | null;
		gameVersion: { game: { name: string } };
	}[];
};

type SessionsTabProps =
	| {
			scope: "plan";
			planId: string;
			childId: string;
			planStatus: string;
			defaultDurationMinutes: number;
	  }
	| { scope: "child"; childId: string };

function AggregateSummary({ sessions }: { sessions: SessionListItem[] }) {
	const total = sessions.length;
	const completed = sessions.filter((s) => s.status === "COMPLETED").length;
	const absent = sessions.filter((s) => s.status === "ABSENT").length;
	const manuallyClosed = sessions.filter(
		(s) => s.status === "MANUALLY_CLOSED",
	).length;

	const gameBreakdown = summarizeFamilyStats(
		sessions.map((session) => ({
			gameAssignments: session.gameAssignments.map((a) => ({
				gameName: a.gameVersion.game.name,
				resultSummary: a.resultSummary,
			})),
		})),
	);

	return (
		<div className="rounded-xl border border-surface-container-highest bg-surface-container-lowest p-4">
			<dl className="mb-4 grid grid-cols-4 gap-4 text-sm">
				<div>
					<dt className="text-on-surface-variant">Total</dt>
					<dd className="font-medium">{total}</dd>
				</div>
				<div>
					<dt className="text-on-surface-variant">Completed</dt>
					<dd className="font-medium">{completed}</dd>
				</div>
				<div>
					<dt className="text-on-surface-variant">Absent</dt>
					<dd className="font-medium">{absent}</dd>
				</div>
				<div>
					<dt className="text-on-surface-variant">Manually Closed</dt>
					<dd className="font-medium">{manuallyClosed}</dd>
				</div>
			</dl>

			{gameBreakdown.length > 0 && (
				<>
					<h3 className="mb-2 font-medium text-sm">Per-Game Breakdown</h3>
					<Table className="w-full overflow-hidden">
						<TableHeader>
							<TableRow>
								<TableHead className="whitespace-normal">Game</TableHead>
								<TableHead className="whitespace-normal">
									Sessions Played
								</TableHead>
								<TableHead className="whitespace-normal">Performance</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{gameBreakdown.map((game) => (
								<TableRow key={game.name}>
									<TableCell className="whitespace-normal">
										{game.name}
									</TableCell>
									<TableCell className="whitespace-normal">
										{game.count}
									</TableCell>
									<TableCell className="whitespace-normal">
										{game.stats}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</>
			)}
		</div>
	);
}

export function SessionsTab(props: SessionsTabProps) {
	const navigate = useNavigate();
	const [createSheetOpen, setCreateSheetOpen] = useState(false);

	const { data: sessions, isLoading } = useQuery(
		props.scope === "plan"
			? trpc.session.listForPlan.queryOptions({ planId: props.planId })
			: trpc.session.listForChild.queryOptions({ childId: props.childId }),
	);

	if (isLoading) {
		return <p className="text-on-surface-variant text-sm">Loading sessions…</p>;
	}

	const list = (sessions ?? []) as unknown as SessionListItem[];

	return (
		<div className="flex flex-col gap-6">
			{props.scope === "plan" &&
				props.planStatus === "ACTIVE" &&
				list.length > 0 && (
					<div className="flex items-center justify-end">
						<Button onClick={() => setCreateSheetOpen(true)}>
							<PlusCircle className="mr-2 h-4 w-4" />
							New Session
						</Button>
					</div>
				)}

			{list.length > 0 && <AggregateSummary sessions={list} />}

			{props.scope === "plan" && props.planStatus === "DRAFT" ? (
				<div className="flex flex-col items-center justify-center rounded-2xl border border-outline-variant border-dashed bg-surface-container-lowest p-12 text-center">
					<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
						<CalendarClock className="h-6 w-6 text-amber-600" />
					</div>
					<h3 className="mb-2 font-medium text-lg text-on-surface">
						Plan Not Activated
					</h3>
					<p className="mx-auto max-w-md text-on-surface-variant text-sm">
						This treatment plan is currently a draft. You must activate the plan
						from the overview before you can begin scheduling sessions.
					</p>
				</div>
			) : list.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-2xl border border-outline-variant border-dashed bg-surface-container-lowest p-12 text-center">
					<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
						<CalendarClock className="h-6 w-6 text-primary" />
					</div>
					<h3 className="mb-2 font-medium text-lg text-on-surface">
						No Sessions Scheduled
					</h3>
					<p className="mx-auto mb-6 max-w-md text-on-surface-variant text-sm">
						You haven't scheduled any sessions for this plan yet. Start by
						scheduling the first session to begin treatment.
					</p>
					{props.scope === "plan" && props.planStatus === "ACTIVE" && (
						<Button onClick={() => setCreateSheetOpen(true)}>
							<PlusCircle className="mr-2 h-4 w-4" />
							Schedule Session
						</Button>
					)}
				</div>
			) : (
				<div className="grid gap-4">
					{list.map((session) => {
						const statusInfo =
							STATUS_BADGE[session.status] ?? STATUS_BADGE.PENDING;
						return (
							<div
								key={session.id}
								className="rounded-xl border border-surface-container-highest bg-surface-container-lowest p-5 transition-shadow hover:shadow-sm"
							>
								<div className="mb-4 flex items-center justify-between">
									<div className="flex items-center gap-2">
										<CalendarClock className="h-5 w-5 text-on-surface-variant" />
										<span className="font-semibold text-base text-on-surface">
											{new Date(session.scheduledDate).toLocaleDateString(
												undefined,
												{
													weekday: "long",
													year: "numeric",
													month: "long",
													day: "numeric",
												},
											)}
										</span>
									</div>
									<Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
								</div>

								{session.status === "COMPLETED" &&
								session.gameAssignments.length > 0 ? (
									<div className="mt-2 grid gap-4 lg:grid-cols-2">
										{session.gameAssignments.map((assignment) => (
											<GameResultCard
												key={assignment.id}
												gameName={assignment.gameVersion.game.name}
												resultSummary={assignment.resultSummary}
											/>
										))}
									</div>
								) : (
									<div className="mt-2 rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-3">
										<p className="font-medium text-on-surface-variant text-sm">
											Assigned Activities:{" "}
											<span className="font-normal">
												{session.gameAssignments.length > 0
													? session.gameAssignments
															.map((a) => a.gameVersion.game.name)
															.join(", ")
													: "No specific games assigned"}
											</span>
										</p>
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}

			{props.scope === "plan" && (
				<CreateSessionSheet
					open={createSheetOpen}
					onOpenChange={setCreateSheetOpen}
					planId={props.planId}
					childId={props.childId}
					defaultDurationMinutes={props.defaultDurationMinutes}
					onSuccess={(sessionId) =>
						navigate({ to: "/sessions/$sessionId", params: { sessionId } })
					}
				/>
			)}
		</div>
	);
}
