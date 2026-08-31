import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@haber-final/ui/components/alert";

type Conflict = {
	id: string;
	scheduledDate: Date | string;
	durationMinutes: number;
	child: { fullName: string };
};

type ConflictWarningProps = {
	roomConflicts: Conflict[];
	therapistConflicts: Conflict[];
};

function formatTime(date: Date | string) {
	return new Date(date).toLocaleTimeString(undefined, {
		hour: "numeric",
		minute: "2-digit",
	});
}

export function ConflictWarning({
	roomConflicts,
	therapistConflicts,
}: ConflictWarningProps) {
	if (roomConflicts.length === 0 && therapistConflicts.length === 0)
		return null;

	return (
		<Alert className="border-warning/30 bg-warning/10">
			<AlertTitle className="flex items-center gap-2 text-warning">
				<span className="material-symbols-outlined text-sm">warning</span>
				Scheduling Conflict
			</AlertTitle>
			<AlertDescription className="space-y-1 text-on-surface-variant text-sm">
				{roomConflicts.map((c) => (
					<p key={c.id}>
						Room is already booked for {c.child.fullName} at{" "}
						{formatTime(c.scheduledDate)}.
					</p>
				))}
				{therapistConflicts.map((c) => (
					<p key={c.id}>
						Therapist already has a session with {c.child.fullName} at{" "}
						{formatTime(c.scheduledDate)}.
					</p>
				))}
				<p className="font-medium">
					You can still create this session, but double-check before proceeding.
				</p>
			</AlertDescription>
		</Alert>
	);
}
