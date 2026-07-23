import type { SectionESchema } from "@haber-final/api/schemas/assessment";
import type { z } from "zod";

import { AssessmentSectionCard } from "../AssessmentSectionCard";
import { ReadOnlyField } from "./ReadOnlyField";
import { TagList } from "./TagList";

type SectionEData = z.infer<typeof SectionESchema>;

export function ReadOnlySectionE({
	data,
	functionalConcernById,
}: {
	data: SectionEData;
	functionalConcernById: Record<string, string>;
}) {
	const concernLabels = data.functionalConcerns
		.map((id) => functionalConcernById[id] ?? id)
		.join(", ");

	return (
		<AssessmentSectionCard title="Section E — Functional & Fine Motor Skills">
			<ReadOnlyField
				label="Areas of Concern"
				value={concernLabels}
				className="md:col-span-2"
			/>
			<ReadOnlyField
				label="Clinical Observations & Findings"
				value={<TagList items={data.observations} />}
				className="md:col-span-2"
			/>
		</AssessmentSectionCard>
	);
}
