import type { SectionDSchema } from "@haber-final/api/schemas/assessment";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@haber-final/ui/components/table";
import type { z } from "zod";

import { AssessmentSectionCard } from "../AssessmentSectionCard";
import { ReadOnlyField } from "./ReadOnlyField";
import { TagList } from "./TagList";

type SectionDData = z.infer<typeof SectionDSchema>;

export function ReadOnlySectionD({
	data,
	sensorySystemById,
}: {
	data: SectionDData;
	sensorySystemById: Record<string, string>;
}) {
	return (
		<AssessmentSectionCard title="Section D — Sensory Processing Profile">
			<div className="overflow-x-auto md:col-span-2">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Sensory System</TableHead>
							<TableHead className="w-32">Rating (1–5)</TableHead>
							<TableHead>Notes</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{data.sensoryProfile.map((r) => (
							<TableRow key={r.systemId}>
								<TableCell className="font-medium text-on-surface">
									{sensorySystemById[r.systemId] ?? r.systemId}
								</TableCell>
								<TableCell>{r.rating}</TableCell>
								<TableCell>
									{r.notes || <span className="text-outline">—</span>}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			<ReadOnlyField
				label="Behavioural Observations"
				value={<TagList items={data.behaviouralObservations} />}
				className="md:col-span-2"
			/>
		</AssessmentSectionCard>
	);
}
