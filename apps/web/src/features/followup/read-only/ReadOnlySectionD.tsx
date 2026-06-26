import type { FollowUpSectionDSchema } from "@haber-final/api/schemas/assessment";
import type { z } from "zod";
import { ReadOnlyField } from "../../assessment/read-only/ReadOnlyField";
import { SectionCard } from "../../assessment/SectionCard";
import { COMPLIANCE_OPTIONS, ENGAGEMENT_OPTIONS } from "../constants";

type SectionDData = z.infer<typeof FollowUpSectionDSchema>;

type ReadOnlySectionDProps = {
	data: SectionDData;
};

function getComplianceLabel(value: string): string {
	return COMPLIANCE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function getEngagementLabel(value: string): string {
	return ENGAGEMENT_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function ReadOnlySectionD({ data }: ReadOnlySectionDProps) {
	return (
		<SectionCard title="Section D — Follow-Up Clinical Questions">
			<ReadOnlyField
				label="Improvements at Home"
				value={data.improvementsAtHome}
				className="md:col-span-2"
			/>
			<ReadOnlyField
				label="Improvements at School"
				value={data.improvementsAtSchool}
				className="md:col-span-2"
			/>
			<ReadOnlyField
				label="Regression(s) Noted"
				value={data.regressions}
				className="md:col-span-2"
			/>
			<ReadOnlyField
				label="Home Program Compliance"
				value={getComplianceLabel(data.homeProgramCompliance)}
			/>
			<ReadOnlyField
				label="Session Engagement"
				value={getEngagementLabel(data.sessionEngagement)}
			/>
			<ReadOnlyField
				label="School Performance Changes"
				value={data.schoolPerformanceChanges}
				className="md:col-span-2"
			/>
			<ReadOnlyField
				label="Behaviour Changes"
				value={data.behaviourChanges}
				className="md:col-span-2"
			/>
			<ReadOnlyField
				label="New Skills Observed"
				value={data.newSkillsObserved}
				className="md:col-span-2"
			/>
			<ReadOnlyField
				label="Equipment Effectively Used"
				value={data.equipmentEffectivelyUsed}
				className="md:col-span-2"
			/>
			<ReadOnlyField
				label="Therapist Observations"
				value={data.therapistObservations}
				className="md:col-span-2"
			/>
		</SectionCard>
	);
}
