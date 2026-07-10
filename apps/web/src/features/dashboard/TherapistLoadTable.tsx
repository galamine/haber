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

type TherapistLoad = {
	therapistId: string;
	name: string;
	assignedToday: number;
	completedToday: number;
};

type TherapistLoadTableProps = {
	therapists: TherapistLoad[];
};

function loadVariant(count: number): "success" | "warning" | "destructive" {
	if (count <= 3) return "success";
	if (count <= 6) return "warning";
	return "destructive";
}

export function TherapistLoadTable({ therapists }: TherapistLoadTableProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="font-medium text-on-surface">
					Therapist Load
				</CardTitle>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Therapist</TableHead>
							<TableHead>Assigned Today</TableHead>
							<TableHead>Completed Today</TableHead>
							<TableHead>Load</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{therapists.map((t) => (
							<TableRow key={t.therapistId}>
								<TableCell className="font-medium text-on-surface">
									{t.name}
								</TableCell>
								<TableCell className="text-on-surface-variant">
									{t.assignedToday}
								</TableCell>
								<TableCell className="text-on-surface-variant">
									{t.completedToday}
								</TableCell>
								<TableCell>
									<Badge variant={loadVariant(t.assignedToday)}>
										{t.assignedToday}
									</Badge>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}
