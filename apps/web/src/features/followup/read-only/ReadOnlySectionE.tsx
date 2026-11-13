import type { FollowUpSectionESchema } from "@haber-final/api/schemas/assessment";
import type { z } from "zod";
import { AssessmentSectionCard } from "../../assessment/AssessmentSectionCard";
import { ReadOnlyField } from "../../assessment/read-only/ReadOnlyField";
import {
	GOAL_STATUS_DECISION_OPTIONS,
	NEXT_ASSESSMENT_TYPE_OPTIONS,
} from "../constants";

type SectionEData = z.infer<typeof FollowUpSectionESchema>;

type ReadOnlySectionEProps = {
	data: SectionEData;
};

function getDecisionLabels(values: string[]): string {
	return values
		.map(
			(v) =>
				GOAL_STATUS_DECISION_OPTIONS.find((o) => o.value === v)?.label ?? v,
		)
		.join(", ");
}

function getNextAssessmentLabel(value: string): string {
	return (
		NEXT_ASSESSMENT_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value
	);
}

export function ReadOnlySectionE({ data }: ReadOnlySectionEProps) {
	return (
		<AssessmentSectionCard title="Section E — Plan Adjustments & Next Steps">
			<ReadOnlyField
				label="Goal Status Decisions"
				value={getDecisionLabels(data.goalStatusDecisions)}
				className="md:col-span-2"
			/>

			<ReadOnlyField
				label="Next Follow-Up Date"
				value={data.nextFollowUpDate}
			/>
			<ReadOnlyField
				label="Next Assessment Type"
				value={getNextAssessmentLabel(data.nextAssessmentType)}
			/>
			<ReadOnlyField
				label="Clinical Notes"
				value={data.clinicalNotes}
				className="md:col-span-2"
			/>
		</AssessmentSectionCard>
	);
}
