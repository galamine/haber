import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@haber-final/ui/components/avatar";
import { Card } from "@haber-final/ui/components/card";

type ChildSnapshot = {
	name: string;
	age: number;
	opNumber: string;
	activePlan: { id: string; name: string; status: string } | null;
	nextSession: Date | null;
	attendancePct: number;
	photoUrl?: string | null;
};

function getInitials(name: string) {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();
}

function formatDate(date: Date) {
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(date));
}

type SnapshotCardProps = ChildSnapshot;

export function SnapshotCard({
	name,
	age,
	opNumber,
	activePlan,
	nextSession,
	attendancePct,
	photoUrl,
}: SnapshotCardProps) {
	return (
		<Card className="p-5">
			<div className="flex items-start justify-between">
				<div className="flex items-center gap-4">
					<Avatar className="h-14 w-14">
						{photoUrl && <AvatarImage src={photoUrl} alt={name} />}
						<AvatarFallback className="bg-brown-200 text-brown-800 text-lg">
							{getInitials(name)}
						</AvatarFallback>
					</Avatar>
					<div>
						<h2 className="font-semibold text-lg text-on-surface">{name}</h2>
						<p className="text-on-surface-variant text-sm">
							{age} yrs · {opNumber}
						</p>
					</div>
				</div>
				<div className="text-right">
					<p className="font-medium text-on-surface text-sm">
						{activePlan?.name ?? "No active plan"}
					</p>
					<p className="text-on-surface-variant text-xs">
						Attendance: {attendancePct.toFixed(0)}%
					</p>
				</div>
			</div>
			{nextSession && (
				<div className="mt-4 rounded-lg bg-accent px-3 py-2">
					<p className="text-on-surface-variant text-xs">Next Session</p>
					<p className="font-medium text-on-surface text-sm">
						{formatDate(nextSession)}
					</p>
				</div>
			)}
		</Card>
	);
}
