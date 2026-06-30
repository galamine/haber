import { Button } from "@haber-final/ui/components/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@haber-final/ui/components/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@haber-final/ui/components/sheet";
import { Skeleton } from "@haber-final/ui/components/skeleton";
import { Textarea } from "@haber-final/ui/components/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
	ArrowLeft,
	CalendarClock,
	CheckCircle2,
	ExternalLink,
	Gamepad2,
	MapPin,
	UserX,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
	{ bg: string; text: string; label: string }
> = {
	PENDING: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Pending" },
	IN_PROGRESS: {
		bg: "bg-blue-100",
		text: "text-blue-800",
		label: "In Progress",
	},
	COMPLETED: { bg: "bg-green-100", text: "text-green-800", label: "Completed" },
	ABSENT: { bg: "bg-gray-100", text: "text-gray-600", label: "Absent" },
	MANUALLY_CLOSED: { bg: "bg-red-100", text: "text-red-700", label: "Closed" },
};

type GameAssignment = {
	id: string;
	order: number;
	durationSeconds: number | null;
	repetitions: number | null;
	instructions: string | null;
	gameVersion: {
		id: string;
		versionNumber: string;
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
	result: {
		id: string;
		scored: { score: number; rubric_version: string };
	} | null;
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

function SessionDetailPage() {
	const { sessionId } = Route.useParams();
	const router = useRouter();
	const queryClient = useQueryClient();
	const [closeSheetOpen, setCloseSheetOpen] = useState(false);
	const [notes, setNotes] = useState("");
	const [qualityTag, setQualityTag] = useState<
		"CALM" | "DISTRACTED" | "REFUSED" | undefined
	>();

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

	function handleOpenGame(gameId: string, gameVersionId: string) {
		const webhookUrl = `https://game-server.example.com/?game_id=${gameId}&version=${gameVersionId}&session_id=${sessionId}&webhook_secret=${session?.webhookSecret}`;
		window.open(webhookUrl, "_blank");
	}

	if (isLoading) {
		return <SessionSkeleton />;
	}

	if (!session) {
		return (
			<div className="flex flex-col items-center justify-center gap-3 py-32 text-on-surface-variant">
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
				className="mb-6 flex items-center gap-1.5 text-on-surface-variant text-sm hover:text-on-surface"
			>
				<ArrowLeft className="h-4 w-4" />
				Back to Sessions
			</button>

			{/* Status Banner */}
			<div className="mb-6 flex items-center justify-between rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
				<div className="flex items-center gap-3">
					<span
						className={`inline-flex items-center rounded-full px-3 py-1 font-medium text-sm ${statusInfo.bg} ${statusInfo.text}`}
					>
						{statusInfo.label}
					</span>
					{s.startedAt && (
						<span className="flex items-center gap-1 text-on-surface-variant text-xs">
							<CalendarClock className="h-3 w-3" />
							Started: {new Date(s.startedAt).toLocaleTimeString()}
						</span>
					)}
				</div>
				<div className="flex items-center gap-2">
					{s.status === "PENDING" && (
						<Button
							variant="outline"
							size="sm"
							className="gap-1.5 border-red-300 text-red-600 hover:bg-red-50"
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
				</div>
			</div>

			{/* Child Summary */}
			<div className="mb-6 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
				<h2 className="mb-2 font-medium text-on-surface text-sm">
					Child Information
				</h2>
				<p className="text-lg text-on-surface">Child ID: {s.childId}</p>
			</div>

			{/* Room Assignment */}
			<div className="mb-6 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
				<h2 className="mb-3 flex items-center gap-2 font-medium text-on-surface text-sm">
					<MapPin className="h-4 w-4" />
					Room Assignment
				</h2>
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
			</div>

			{/* Game Cards */}
			<div className="mb-6">
				<h2 className="mb-3 flex items-center gap-2 font-medium text-on-surface text-sm">
					<Gamepad2 className="h-4 w-4" />
					Games ({s.gameAssignments.length})
				</h2>
				<div className="grid gap-4 lg:grid-cols-2">
					{s.gameAssignments.map((assignment) => (
						<div
							key={assignment.id}
							className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4"
						>
							<div className="mb-2 flex items-start justify-between">
								<div>
									<p className="font-medium text-on-surface text-sm">
										{assignment.gameVersion.game.name}
									</p>
									<p className="text-on-surface-variant text-xs">
										Version: {assignment.gameVersion.versionNumber}
									</p>
								</div>
							</div>
							{assignment.instructions && (
								<p className="mb-3 text-on-surface-variant text-xs">
									{assignment.instructions}
								</p>
							)}
							<div className="mb-3 flex items-center gap-3 text-on-surface-variant text-xs">
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
								onClick={() =>
									handleOpenGame(
										assignment.gameVersion.game.id,
										assignment.gameVersion.id,
									)
								}
							>
								<ExternalLink className="h-4 w-4" />
								Open Game
							</Button>
						</div>
					))}
				</div>
			</div>

			{/* Game Result */}
			{s.status === "COMPLETED" && s.result && (
				<div className="mb-6 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
					<h2 className="mb-3 flex items-center gap-2 font-medium text-on-surface text-sm">
						<CheckCircle2 className="h-4 w-4 text-green-600" />
						Game Result
					</h2>
					<div className="grid gap-4 sm:grid-cols-2">
						<div>
							<p className="text-on-surface-variant text-xs">Score</p>
							<p className="font-medium text-lg text-on-surface">
								{s.result.scored.score}
							</p>
						</div>
						<div>
							<p className="text-on-surface-variant text-xs">Rubric Version</p>
							<p className="font-medium text-on-surface text-sm">
								{s.result.scored.rubric_version}
							</p>
						</div>
					</div>
				</div>
			)}

			{/* Notes */}
			<div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
				<h2 className="mb-3 font-medium text-on-surface text-sm">Notes</h2>
				<Textarea
					value={s.notes ?? notes}
					onChange={(e) => setNotes(e.target.value)}
					placeholder="Add session notes..."
					className="mb-3 min-h-24"
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
			</div>

			{/* Close Session Sheet */}
			<Sheet open={closeSheetOpen} onOpenChange={setCloseSheetOpen}>
				<SheetContent side="right" className="overflow-y-auto sm:max-w-md">
					<SheetHeader>
						<SheetTitle>Close Session</SheetTitle>
						<SheetDescription>
							Add optional notes and quality tag before closing.
						</SheetDescription>
					</SheetHeader>
					<div className="mt-6 space-y-4">
						<div>
							<label
								htmlFor="session-notes"
								className="mb-2 block font-medium text-on-surface text-sm"
							>
								Notes
							</label>
							<Textarea
								id="session-notes"
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								placeholder="Session notes..."
								className="min-h-32"
							/>
						</div>
						<div>
							<label
								htmlFor="quality-tag"
								className="mb-2 block font-medium text-on-surface text-sm"
							>
								Quality Tag
							</label>
							<div id="quality-tag" className="flex gap-2">
								{(["CALM", "DISTRACTED", "REFUSED"] as const).map((tag) => (
									<button
										key={tag}
										type="button"
										onClick={() => setQualityTag(tag)}
										className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
											qualityTag === tag
												? "border-primary bg-primary/10 text-primary"
												: "border-outline-variant text-on-surface-variant hover:bg-muted"
										}`}
									>
										{tag}
									</button>
								))}
							</div>
						</div>
					</div>
					<SheetFooter className="mt-6">
						<Button variant="outline" onClick={() => setCloseSheetOpen(false)}>
							Cancel
						</Button>
						<Button
							disabled={manualCloseMutation.isPending}
							onClick={() => {
								manualCloseMutation.mutate({
									sessionId,
									notes: notes || undefined,
									qualityTag,
								});
							}}
						>
							{manualCloseMutation.isPending ? "Closing..." : "Close Session"}
						</Button>
					</SheetFooter>
				</SheetContent>
			</Sheet>
		</div>
	);
}
