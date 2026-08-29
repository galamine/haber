import type { GameResultSummary } from "@haber-final/api/lib/game-result-summary";
import { env } from "@haber-final/env/web";
import { Button } from "@haber-final/ui/components/button";
import { Card, CardContent } from "@haber-final/ui/components/card";
import { CloseSessionSheet } from "@haber-final/ui/components/close-session-sheet";
import { SectionHeader } from "@haber-final/ui/components/section-header";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@haber-final/ui/components/select";
import { Skeleton } from "@haber-final/ui/components/skeleton";
import { Textarea } from "@haber-final/ui/components/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, Gamepad2, MapPin, UserX } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { GameResultCard } from "@/features/session/game-result/GameResultCard";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_authenticated/sessions/$sessionId")({
	component: SessionDetailPage,
});

type SessionStatus =
	| "PENDING"
	| "IN_PROGRESS"
	| "COMPLETED"
	| "ABSENT"
	| "MANUALLY_CLOSED";

const STATUS_BADGE: Record<
	SessionStatus,
	{
		variant:
			| "default"
			| "secondary"
			| "destructive"
			| "outline"
			| "warning"
			| "success";
		label: string;
	}
> = {
	PENDING: { variant: "warning", label: "Pending" },
	IN_PROGRESS: { variant: "outline", label: "In Progress" },
	COMPLETED: { variant: "success", label: "Completed" },
	ABSENT: { variant: "outline", label: "Absent" },
	MANUALLY_CLOSED: { variant: "destructive", label: "Closed" },
};

type GameAssignment = {
	id: string;
	order: number;
	durationSeconds: number | null;
	repetitions: number | null;
	instructions: string | null;
	resultSummary: GameResultSummary | null;
	gameVersion: {
		id: string;
		versionNumber: string;
		path: string | null;
		totalTimeSec: number | null;
		supportedLevels: number[];
		game: {
			id: string;
			name: string;
		};
	};
};

type Session = {
	id: string;
	childId: string;
	scheduledDate: Date;
	status: SessionStatus;
	startedAt: Date | null;
	completedAt: Date | null;
	assignedTherapistId: string | null;
	roomId: string | null;
	notes: string | null;
	qualityTag: string | null;
	gameAssignments: GameAssignment[];
	child?: {
		fullName: string;
		photoUrl: string | null;
		opNumber: string;
		dob: Date;
		sex: string;
		consentStatus: string;
	};
	plan?: {
		name: string;
	};
};

type Room = {
	id: string;
	name: string;
};

function SessionSkeleton() {
	return (
		<div className="p-8">
			<Skeleton className="mb-6 h-6 w-24" />
			<Skeleton className="mb-6 h-8 w-64" />
			<div className="grid gap-6 lg:grid-cols-2">
				<Skeleton className="h-48 w-full rounded-xl" />
				<Skeleton className="h-48 w-full rounded-xl" />
			</div>
		</div>
	);
}

function getAge(dob: Date) {
	const d = new Date(dob);
	const now = new Date();
	let age = now.getFullYear() - d.getFullYear();
	const m = now.getMonth() - d.getMonth();
	if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
	return age;
}

function SessionDetailPage() {
	const { sessionId } = Route.useParams();
	const router = useRouter();
	const queryClient = useQueryClient();
	const [closeSheetOpen, setCloseSheetOpen] = useState(false);
	const [notes, setNotes] = useState("");

	const { data: session, isLoading } = useQuery(
		trpc.session.get.queryOptions({ sessionId }),
	);

	useEffect(() => {
		if (session?.status !== "IN_PROGRESS") return;

		const interval = setInterval(() => {
			queryClient.invalidateQueries({
				queryKey: trpc.session.get.queryOptions({ sessionId }).queryKey,
			});
		}, 5_000);

		return () => clearInterval(interval);
	}, [session?.status, queryClient, sessionId]);

	const { data: rooms } = useQuery(trpc.clinic.listSensoryRooms.queryOptions());

	const assignRoomMutation = useMutation(
		trpc.session.assignRoom.mutationOptions({
			onSuccess: () => {
				toast.success("Room assigned");
				queryClient.invalidateQueries({
					queryKey: trpc.session.get.queryOptions({ sessionId }).queryKey,
				});
			},
			onError: (err) => toast.error(err.message),
		}),
	);

	const markAbsentMutation = useMutation(
		trpc.session.markAbsent.mutationOptions({
			onSuccess: () => {
				toast.success("Session marked absent");
				queryClient.invalidateQueries({
					queryKey: trpc.session.get.queryOptions({ sessionId }).queryKey,
				});
				queryClient.invalidateQueries({
					queryKey: trpc.session.listForToday.queryOptions().queryKey,
				});
			},
			onError: (err) => toast.error(err.message),
		}),
	);

	const manualCloseMutation = useMutation(
		trpc.session.manualClose.mutationOptions({
			onSuccess: () => {
				toast.success("Session closed");
				setCloseSheetOpen(false);
				queryClient.invalidateQueries({
					queryKey: trpc.session.get.queryOptions({ sessionId }).queryKey,
				});
				queryClient.invalidateQueries({
					queryKey: trpc.session.listForToday.queryOptions().queryKey,
				});
			},
			onError: (err) => toast.error(err.message),
		}),
	);

	const addNotesMutation = useMutation(
		trpc.session.addNotes.mutationOptions({
			onSuccess: () => {
				toast.success("Notes saved");
				queryClient.invalidateQueries({
					queryKey: trpc.session.get.queryOptions({ sessionId }).queryKey,
				});
			},
			onError: (err) => toast.error(err.message),
		}),
	);

	function handleOpenGame(assignment: GameAssignment) {
		if (!assignment.gameVersion.path) {
			toast.error("This game version has no launch path configured");
			return;
		}
		if (!localStorage.getItem("pf_calibration")) {
			window.open(
				`${env.VITE_GAME_SERVER_URL}/trail_games/calibration.html`,
				"_blank",
			);
			return;
		}
		const totalTime =
			assignment.durationSeconds ?? assignment.gameVersion.totalTimeSec;
		const level = assignment.gameVersion.supportedLevels[0] ?? 1;
		const params = new URLSearchParams({
			session: sessionId,
			level: String(level),
			version: assignment.gameVersion.versionNumber,
			webhook_secret: session?.webhookSecret ?? "",
		});
		if (totalTime != null) {
			params.set("totalTime", String(totalTime));
		}
		const webhookUrl = `${env.VITE_GAME_SERVER_URL}${assignment.gameVersion.path}?${params.toString()}`;
		window.open(webhookUrl, "_blank");
	}

	if (isLoading) {
		return <SessionSkeleton />;
	}

	if (!session) {
		return (
			<div className="flex flex-col items-center justify-center gap-3 py-32 text-muted-foreground">
				<p className="text-sm">Session not found.</p>
				<Button
					variant="outline"
					onClick={() => router.navigate({ to: "/sessions" })}
				>
					Back to Sessions
				</Button>
			</div>
		);
	}

	const s = session as unknown as Session;
	const statusInfo = STATUS_BADGE[s.status] ?? STATUS_BADGE.PENDING;

	return (
		<div className="p-8">
			<button
				type="button"
				onClick={() => router.navigate({ to: "/sessions" })}
				className="mb-6 flex items-center gap-1.5 text-muted-foreground text-sm hover:text-foreground"
			>
				<ArrowLeft className="h-4 w-4" />
				Back to Sessions
			</button>

			{/* Status Banner */}
			<Card className="mb-6">
				<SectionHeader
					badge={{ label: statusInfo.label, variant: statusInfo.variant }}
					title="Session"
					description={
						s.startedAt
							? `Started: ${new Date(s.startedAt).toLocaleTimeString()}`
							: undefined
					}
					actions={
						<>
							{s.status === "PENDING" && (
								<Button
									variant="outline"
									size="sm"
									className="gap-1.5 border-red-300 text-red-700 hover:bg-red-50"
									onClick={() => markAbsentMutation.mutate({ sessionId })}
								>
									<UserX className="h-4 w-4" />
									Mark Absent
								</Button>
							)}
							{(s.status === "PENDING" || s.status === "IN_PROGRESS") && (
								<Button size="sm" onClick={() => setCloseSheetOpen(true)}>
									Close Session
								</Button>
							)}
						</>
					}
				/>
				<CardContent />
			</Card>

			{/* Child Summary */}
			<Card className="mb-6">
				<SectionHeader
					avatar={{
						src: s.child?.photoUrl ?? undefined,
						fallback:
							s.child?.fullName
								?.split(" ")
								.map((n: string) => n[0])
								.join("")
								.slice(0, 2)
								.toUpperCase() ?? s.childId.slice(0, 2).toUpperCase(),
					}}
					title="Child Information"
					meta={s.child ? `OP: ${s.child.opNumber}` : undefined}
				/>
				<CardContent className="flex flex-col gap-1 text-sm">
					<p className="font-medium text-foreground">
						{s.child?.fullName ?? "Unknown"}
					</p>
					<p className="text-muted-foreground">
						{s.child ? `${getAge(new Date(s.child.dob))} yrs` : "—"}
					</p>
					<p className="text-muted-foreground">{s.child?.sex ?? "—"}</p>
					<p className="text-muted-foreground">{s.plan?.name ?? "No plan"}</p>
				</CardContent>
			</Card>

			{/* Room Assignment */}
			<Card className="mb-6">
				<SectionHeader
					icon={<MapPin className="h-5 w-5" />}
					title="Room Assignment"
				/>
				<CardContent>
					<Select
						value={s.roomId ?? "unassigned"}
						onValueChange={(value) => {
							if (value !== "unassigned") {
								assignRoomMutation.mutate({ sessionId, roomId: value });
							}
						}}
						disabled={assignRoomMutation.isPending}
					>
						<SelectTrigger className="w-64">
							<SelectValue placeholder="Select a room" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="unassigned">Unassigned</SelectItem>
							{(rooms ?? []).map((room: Room) => (
								<SelectItem key={room.id} value={room.id}>
									{room.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</CardContent>
			</Card>

			{/* Game Cards */}
			<Card className="mb-6">
				<SectionHeader
					icon={<Gamepad2 className="h-5 w-5" />}
					title={`Games (${s.gameAssignments.length})`}
				/>
				<CardContent>
					<div className="grid gap-4 lg:grid-cols-2">
						{s.gameAssignments.map((assignment) => (
							<div
								key={assignment.id}
								className="rounded-xl border border-border bg-card p-4"
							>
								<div className="mb-2 flex items-start justify-between">
									<div>
										<p className="font-medium text-sm">
											{assignment.gameVersion.game.name}
										</p>
										<p className="text-muted-foreground text-xs">
											Version: {assignment.gameVersion.versionNumber}
										</p>
									</div>
								</div>
								{assignment.instructions && (
									<p className="mb-3 text-muted-foreground text-xs">
										{assignment.instructions}
									</p>
								)}
								<div className="mb-3 flex items-center gap-3 text-muted-foreground text-xs">
									{assignment.durationSeconds && (
										<span>Duration: {assignment.durationSeconds}s</span>
									)}
									{assignment.repetitions && (
										<span>Reps: {assignment.repetitions}</span>
									)}
								</div>
								<Button
									size="sm"
									variant="outline"
									className="w-full gap-1.5"
									onClick={() => handleOpenGame(assignment)}
								>
									<ExternalLink className="h-4 w-4" />
									Open Game
								</Button>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Game Results */}
			{s.status === "COMPLETED" && s.gameAssignments.length > 0 && (
				<div className="mb-6 grid gap-4 lg:grid-cols-2">
					{s.gameAssignments.map((assignment) => (
						<GameResultCard
							key={assignment.id}
							gameName={assignment.gameVersion.game.name}
							resultSummary={assignment.resultSummary}
						/>
					))}
				</div>
			)}

			{/* Notes */}
			<Card className="mb-6">
				<SectionHeader title="Notes" />
				<CardContent className="flex flex-col gap-3">
					<Textarea
						value={s.notes ?? notes}
						onChange={(e) => setNotes(e.target.value)}
						placeholder="Add session notes..."
						className="min-h-24"
					/>
					<Button
						size="sm"
						variant="outline"
						disabled={addNotesMutation.isPending}
						onClick={() => {
							addNotesMutation.mutate({
								sessionId,
								notes,
								qualityTag: s.qualityTag as
									| "CALM"
									| "DISTRACTED"
									| "REFUSED"
									| undefined,
							});
						}}
					>
						Save Notes
					</Button>
				</CardContent>
			</Card>

			{/* Close Session Sheet */}
			<CloseSessionSheet
				open={closeSheetOpen}
				onOpenChange={setCloseSheetOpen}
				disabled={manualCloseMutation.isPending}
				onSubmit={(data) => {
					manualCloseMutation.mutate({
						sessionId,
						notes: data.notes,
						qualityTag: data.qualityTag,
					});
				}}
			/>
		</div>
	);
}
