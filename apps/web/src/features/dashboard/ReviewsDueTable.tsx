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

type ReviewDue = {
	id: string;
	reviewDueAt: Date | string | null;
	child: { fullName: string; opNumber: string } | null;
};

type ReviewsDueTableProps = {
	reviews: ReviewDue[];
};

function isOverdue(dueAt: Date | string | null) {
	if (!dueAt) return false;
	return new Date(dueAt).getTime() < Date.now();
}

export function ReviewsDueTable({ reviews }: ReviewsDueTableProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="font-medium text-on-surface">
					Reviews Due
				</CardTitle>
			</CardHeader>
			<CardContent>
				{reviews.length === 0 ? (
					<div className="flex h-24 items-center justify-center rounded-xl border border-surface-container-highest bg-surface-container-lowest">
						<p className="text-on-surface-variant text-sm">No reviews due.</p>
					</div>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Child</TableHead>
								<TableHead>Op Number</TableHead>
								<TableHead>Review Due</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{reviews.map((r) => (
								<TableRow key={r.id}>
									<TableCell className="font-medium text-on-surface">
										{r.child?.fullName ?? "—"}
									</TableCell>
									<TableCell className="text-on-surface-variant">
										{r.child?.opNumber ?? "—"}
									</TableCell>
									<TableCell>
										<Badge
											variant={
												isOverdue(r.reviewDueAt) ? "destructive" : "outline"
											}
										>
											{r.reviewDueAt
												? format(new Date(r.reviewDueAt), "MMM d, yyyy")
												: "—"}
										</Badge>
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
