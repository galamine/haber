import { Badge } from "@haber-final/ui/components/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@haber-final/ui/components/card";
import { Progress } from "@haber-final/ui/components/progress";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@haber-final/ui/components/table";

type Room = {
	id: string;
	name: string;
	code: string;
	status: "ACTIVE" | "MAINTENANCE";
	bookedToday: boolean;
	occupyingTherapist: string | null;
};

type RoomUtilisationTableProps = {
	rooms: Room[];
	booked: number;
	total: number;
};

export function RoomUtilisationTable({
	rooms,
	booked,
	total,
}: RoomUtilisationTableProps) {
	const bookedRatio = total > 0 ? (booked / total) * 100 : 0;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="font-medium text-on-surface">
					Room Utilisation
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Code</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Booked Today</TableHead>
							<TableHead>Therapist</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rooms.map((room) => (
							<TableRow key={room.id}>
								<TableCell className="font-medium text-on-surface">
									{room.name}
								</TableCell>
								<TableCell className="text-on-surface-variant">
									{room.code}
								</TableCell>
								<TableCell>
									<Badge
										variant={room.status === "ACTIVE" ? "secondary" : "outline"}
									>
										{room.status}
									</Badge>
								</TableCell>
								<TableCell>
									<Badge variant={room.bookedToday ? "default" : "outline"}>
										{room.bookedToday ? "Yes" : "No"}
									</Badge>
								</TableCell>
								<TableCell className="text-on-surface-variant">
									{room.occupyingTherapist ?? "—"}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
				<div className="space-y-1">
					<div className="flex justify-between text-on-surface-variant text-xs">
						<span>
							{booked}/{total} rooms booked
						</span>
						<span>{bookedRatio.toFixed(0)}%</span>
					</div>
					<Progress value={bookedRatio} />
				</div>
			</CardContent>
		</Card>
	);
}
