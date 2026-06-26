import type { FollowUpSectionBSchema } from "@haber-final/api/schemas/assessment";
import { Badge } from "@haber-final/ui/components/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@haber-final/ui/components/table";
import type { z } from "zod";

import { SectionCard } from "../../assessment/SectionCard";

type SectionBData = z.infer<typeof FollowUpSectionBSchema>;

type ReadOnlySectionBProps = {
	data: SectionBData;
	goalDescriptionById: Record<string, string>;
};

const STATUS_COLORS: Record<string, string> = {
	MET: "bg-green-100 text-green-800",
	IN_PROGRESS: "bg-blue-100 text-blue-800",
	NOT_MET: "bg-red-100 text-red-800",
	DISCONTINUED: "bg-gray-100 text-gray-800",
};

export function ReadOnlySectionB({
	data,
	goalDescriptionById,
}: ReadOnlySectionBProps) {
	if (data.goalProgress.length === 0) {
		return (
			<SectionCard title="Section B — Goal Progress Review">
				<div className="rounded-lg border border-outline-variant p-6 text-center md:col-span-2">
					<p className="text-on-surface-variant text-sm">
						No goal progress entries recorded.
					</p>
				</div>
			</SectionCard>
		);
	}

	return (
		<SectionCard title="Section B — Goal Progress Review">
			<div className="overflow-x-auto md:col-span-2">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Goal</TableHead>
							<TableHead className="w-24">Attainment</TableHead>
							<TableHead className="w-32">Status</TableHead>
							<TableHead>Evidence Notes</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{data.goalProgress.map((r) => (
							<TableRow key={r.goalId}>
								<TableCell className="font-medium text-on-surface">
									{goalDescriptionById[r.goalId] ?? r.goalId}
								</TableCell>
								<TableCell>{r.attainmentPct}%</TableCell>
								<TableCell>
									<Badge
										variant="secondary"
										className={STATUS_COLORS[r.status] ?? ""}
									>
										{r.status}
									</Badge>
								</TableCell>
								<TableCell>
									{r.evidenceNotes || <span className="text-outline">—</span>}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</SectionCard>
	);
}
