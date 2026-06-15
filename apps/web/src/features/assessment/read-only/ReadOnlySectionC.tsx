import type { SectionCSchema } from "@haber-final/api/schemas/assessment";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@haber-final/ui/components/table";
import type { z } from "zod";

import { SectionCard } from "../SectionCard";

type SectionCData = z.infer<typeof SectionCSchema>;

export function ReadOnlySectionC({
	data,
	milestoneById,
}: {
	data: SectionCData;
	milestoneById: Record<string, string>;
}) {
	return (
		<SectionCard title="Section C — Developmental Milestones">
			<div className="overflow-x-auto md:col-span-2">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Milestone</TableHead>
							<TableHead className="w-32">Achieved (months)</TableHead>
							<TableHead className="w-20">Delayed</TableHead>
							<TableHead>Notes</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{data.milestones.map((m) => (
							<TableRow key={m.milestoneId}>
								<TableCell className="font-medium text-on-surface">
									{milestoneById[m.milestoneId] ?? m.milestoneId}
								</TableCell>
								<TableCell>
									{m.achievedAtAgeMonths ?? (
										<span className="text-outline">—</span>
									)}
								</TableCell>
								<TableCell>{m.delayed ? "Yes" : "No"}</TableCell>
								<TableCell>
									{m.notes || <span className="text-outline">—</span>}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</SectionCard>
	);
}
