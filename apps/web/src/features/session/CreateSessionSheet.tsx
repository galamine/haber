import { Button } from "@haber-final/ui/components/button";
import { Input } from "@haber-final/ui/components/input";
import { Label } from "@haber-final/ui/components/label";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { DatePicker } from "@/components/date-picker";
import { TimePicker } from "@/components/time-picker";
import { useAuthStore } from "@/stores/auth";
import { trpc } from "@/utils/trpc";
import { ConflictWarning } from "./ConflictWarning";
import { GamePickerSheet } from "./GamePickerSheet";

function combineDateAndTime(date: Date, time: string) {
	const [hours, minutes] = time.split(":").map(Number);
	const combined = new Date(date);
	combined.setHours(hours ?? 0, minutes ?? 0, 0, 0);
	return combined;
}

type CreateSessionSheetProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	planId: string;
	childId: string;
	defaultDurationMinutes: number;
	onSuccess: (sessionId: string) => void;
};

export function CreateSessionSheet({
	open,
	onOpenChange,
	planId,
	defaultDurationMinutes,
	onSuccess,
}: CreateSessionSheetProps) {
	const [date, setDate] = useState<Date>();
	const [time, setTime] = useState<string>("");
	const [durationMinutes, setDurationMinutes] = useState(
		defaultDurationMinutes,
	);
	const currentUserId = useAuthStore((s) => s.userId);
	const [roomId, setRoomId] = useState<string>();
	const [assignedTherapistId, setAssignedTherapistId] = useState<
		string | undefined
	>(currentUserId ?? undefined);
	const [game, setGame] = useState<{
		gameVersionId: string;
		gameName: string;
		durationSeconds?: number;
		repetitions?: number;
		instructions?: string;
	}>();
	const [gamePickerOpen, setGamePickerOpen] = useState(false);
	const [acknowledgeConflict, setAcknowledgeConflict] = useState(false);

	function resetAcknowledgement() {
		setAcknowledgeConflict(false);
	}

	const scheduledDate =
		date && time ? combineDateAndTime(date, time) : undefined;

	const rooms = useQuery(trpc.clinic.listSensoryRooms.queryOptions());
	const activeRooms = rooms.data?.filter((r) => r.status === "ACTIVE") ?? [];

	const therapists = useQuery(
		trpc.staff.list.queryOptions({ role: "THERAPIST", pageSize: 100 }),
	);

	const canCheck =
		!!scheduledDate && !!durationMinutes && (!!roomId || !!assignedTherapistId);
	const conflicts = useQuery({
		...trpc.session.checkConflicts.queryOptions({
			scheduledDate: scheduledDate ?? new Date(),
			durationMinutes,
			roomId,
			assignedTherapistId,
		}),
		enabled: canCheck,
	});

	const queryClient = useQueryClient();
	const create = useMutation(
		trpc.session.create.mutationOptions({
			onSuccess: (session) => {
				toast.success("Session created");
				queryClient.invalidateQueries({
					queryKey: trpc.session.listForPlan.queryOptions({ planId }).queryKey,
				});
				onOpenChange(false);
				onSuccess(session.id);
			},
			onError: (err) => {
				if (err.data?.code === "CONFLICT") {
					setAcknowledgeConflict(true);
					return;
				}
				toast.error(err.message);
			},
		}),
	);

	function handleSubmit() {
		if (!date || !time) {
			toast.error("Date and time are required");
			return;
		}
		if (!roomId) {
			toast.error("Room is required");
			return;
		}
		if (!game) {
			toast.error("Game is required");
			return;
		}
		if (!scheduledDate) return;
		create.mutate({
			planId,
			scheduledDate,
			durationMinutes,
			roomId,
			assignedTherapistId,
			gameVersionId: game.gameVersionId,
			durationSeconds: game.durationSeconds,
			repetitions: game.repetitions,
			instructions: game.instructions,
			acknowledgeConflict,
		});
	}

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="flex w-full flex-col p-6 sm:w-[480px] sm:max-w-[480px]"
			>
				<SheetHeader className="flex-shrink-0 p-0 pr-6">
					<SheetTitle className="font-semibold text-base">
						New Session
					</SheetTitle>
					<SheetDescription>
						Schedule a session for this treatment plan.
					</SheetDescription>
				</SheetHeader>

				<div className="flex-1 space-y-4 overflow-y-auto py-4 pr-1">
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="scheduledDate">Date</Label>
							<DatePicker
								id="scheduledDate"
								value={date}
								onChange={(d) => {
									setDate(d);
									resetAcknowledgement();
								}}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="scheduledTime">Time</Label>
							<TimePicker
								id="scheduledTime"
								value={time}
								onChange={(t) => {
									setTime(t);
									resetAcknowledgement();
								}}
							/>
						</div>
					</div>
					<div className="space-y-2">
						<Label htmlFor="durationMinutes">Duration (minutes)</Label>
						<Input
							id="durationMinutes"
							type="number"
							min={15}
							step={15}
							value={durationMinutes}
							onChange={(e) => {
								setDurationMinutes(Number(e.target.value));
								resetAcknowledgement();
							}}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="roomId">Room</Label>
						<Select
							value={roomId}
							onValueChange={(value) => {
								setRoomId(value);
								resetAcknowledgement();
							}}
						>
							<SelectTrigger id="roomId" className="w-full">
								<SelectValue placeholder="Select a sensory room" />
							</SelectTrigger>
							<SelectContent>
								{activeRooms.map((r) => (
									<SelectItem key={r.id} value={r.id}>
										{r.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="assignedTherapistId">Therapist</Label>
						<Select
							value={assignedTherapistId}
							onValueChange={(value) => {
								setAssignedTherapistId(value);
								resetAcknowledgement();
							}}
						>
							<SelectTrigger id="assignedTherapistId" className="w-full">
								<SelectValue placeholder="Select a therapist" />
							</SelectTrigger>
							<SelectContent>
								{therapists.data?.items.map((t) => (
									<SelectItem key={t.id} value={t.id}>
										{t.email}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="gamePicker">Game</Label>
						<Button
							id="gamePicker"
							type="button"
							variant="outline"
							className="w-full justify-start font-normal"
							onClick={() => setGamePickerOpen(true)}
						>
							{game ? game.gameName : "Choose a game…"}
						</Button>
					</div>

					{conflicts.data && (
						<ConflictWarning
							roomConflicts={conflicts.data.roomConflicts}
							therapistConflicts={conflicts.data.therapistConflicts}
						/>
					)}
				</div>

				<SheetFooter className="mt-auto flex-shrink-0 flex-col gap-2 border-t p-0 pt-4 sm:flex-row sm:justify-end">
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={create.isPending}>
						{acknowledgeConflict ? "Create Anyway" : "Create Session"}
					</Button>
				</SheetFooter>

				<GamePickerSheet
					open={gamePickerOpen}
					onOpenChange={setGamePickerOpen}
					onSelect={(g) => {
						setGame(g);
						setGamePickerOpen(false);
					}}
				/>
			</SheetContent>
		</Sheet>
	);
}
