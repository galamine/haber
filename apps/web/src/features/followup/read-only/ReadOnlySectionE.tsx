import type { FollowUpSectionESchema } from "@haber-final/api/schemas/assessment";
import type { z } from "zod";

import {
	GOAL_STATUS_DECISION_OPTIONS,
	NEXT_ASSESSMENT_TYPE_OPTIONS,
} from "../constants";
import { SectionCard } from "../SectionCard";
import { ReadOnlyField } from "./ReadOnlyField";

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
		<SectionCard title="Section E — Plan Adjustments & Next Steps">
			<ReadOnlyField
				label="Goal Status Decisions"
				value={getDecisionLabels(data.goalStatusDecisions)}
				className="md:col-span-2"
			/>

			<div className="md:col-span-2">
				<dt className="font-medium text-on-surface-variant text-xs uppercase tracking-wider">
					Updated Goals
				</dt>
				{data.updatedGoals.length > 0 ? (
					<ul className="mt-1 list-inside list-disc text-on-surface text-sm">
						{data.updatedGoals.map((g) => (
							<li key={g.goalId}>{g.description}</li>
						))}
					</ul>
				) : (
					<dd className="mt-1 text-on-surface text-sm">—</dd>
				)}
			</div>

			<ReadOnlyField
				label="Updated Home Program"
				value={data.updatedHomeProgram}
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
		</SectionCard>
	);
}
