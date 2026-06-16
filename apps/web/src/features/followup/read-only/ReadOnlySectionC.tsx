import type { SensoryCheckResultSchema } from "@haber-final/api/schemas/assessment";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@haber-final/ui/components/table";
import type { z } from "zod";

import { DeltaBadge } from "../delta-badge";
import { SectionCard } from "../SectionCard";

type ReadOnlySectionCProps = {
	data: { sensoryCheck: z.infer<typeof SensoryCheckResultSchema>[] };
	sensorySystemById: Record<string, string>;
};

export function ReadOnlySectionC({
	data,
	sensorySystemById,
}: ReadOnlySectionCProps) {
	return (
		<SectionCard title="Section C — Sensory Progress Check">
			<div className="overflow-x-auto md:col-span-2">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>System</TableHead>
							<TableHead className="w-32">Baseline</TableHead>
							<TableHead className="w-32">Current</TableHead>
							<TableHead className="w-32">Change</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{data.sensoryCheck.map((r) => (
							<TableRow key={r.systemId}>
								<TableCell className="font-medium text-on-surface">
									{sensorySystemById[r.systemId] ?? r.systemId}
								</TableCell>
								<TableCell>{r.baseline} / 5</TableCell>
								<TableCell>{r.rating} / 5</TableCell>
								<TableCell>
									<DeltaBadge delta={r.change} />
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</SectionCard>
	);
}
