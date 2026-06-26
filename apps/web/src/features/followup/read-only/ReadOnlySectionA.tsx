import type { FollowUpSectionASchema } from "@haber-final/api/schemas/assessment";
import type { z } from "zod";
import { ReadOnlyField } from "../../assessment/read-only/ReadOnlyField";
import { SectionCard } from "../../assessment/SectionCard";

type SectionAData = z.infer<typeof FollowUpSectionASchema>;

export function ReadOnlySectionA({ data }: { data: SectionAData }) {
	return (
		<SectionCard title="Section A — Session Information">
			<ReadOnlyField label="Date" value={data.date} />
			<ReadOnlyField label="Therapist ID" value={data.therapistId} />
			<ReadOnlyField label="Session Number" value={data.sessionNumber} />
			<ReadOnlyField
				label="Weeks Since Initial"
				value={data.weeksSinceInitial}
			/>
			<ReadOnlyField
				label="Parent Present"
				value={data.parentPresent ? "Yes" : "No"}
			/>
		</SectionCard>
	);
}
