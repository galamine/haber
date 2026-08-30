import { Badge } from "@haber-final/ui/components/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@haber-final/ui/components/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@haber-final/ui/components/table";
import { format } from "date-fns";

type SessionNeedingNotes = {
	id: string;
	scheduledDate: Date | string;
	status: string;
	child: { fullName: string } | null;
};

type SessionsNeedingNotesTableProps = {
	sessions: SessionNeedingNotes[];
};

export function SessionsNeedingNotesTable({
	sessions,
}: SessionsNeedingNotesTableProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="font-medium text-on-surface">
					Sessions Needing Notes
				</CardTitle>
			</CardHeader>
			<CardContent>
				{sessions.length === 0 ? (
					<div className="flex h-24 items-center justify-center rounded-xl border border-surface-container-highest bg-surface-container-lowest">
						<p className="text-on-surface-variant text-sm">
							No sessions need notes.
						</p>
					</div>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Child</TableHead>
								<TableHead>Scheduled Date</TableHead>
								<TableHead>Status</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{sessions.map((s) => (
								<TableRow key={s.id}>
									<TableCell className="font-medium text-on-surface">
										{s.child?.fullName ?? "—"}
									</TableCell>
									<TableCell className="text-on-surface-variant">
										{format(new Date(s.scheduledDate), "MMM d, yyyy")}
									</TableCell>
									<TableCell>
										<Badge variant="outline">{s.status}</Badge>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</CardContent>
		</Card>
	);
}
