import type { FollowUpSectionFSchema } from "@haber-final/api/schemas/assessment";
import type { z } from "zod";
import { AssessmentSectionCard } from "../../assessment/AssessmentSectionCard";
import { ReadOnlyField } from "../../assessment/read-only/ReadOnlyField";

type SectionFData = z.infer<typeof FollowUpSectionFSchema>;

type ReadOnlySectionFProps = {
	data: SectionFData;
	signedAt?: string | Date;
};

export function ReadOnlySectionF({ data, signedAt }: ReadOnlySectionFProps) {
	return (
		<AssessmentSectionCard title="Section F — Signatures & Consent">
			<ReadOnlyField label="Therapist Name" value={data.therapistName} />
			<ReadOnlyField label="Credentials" value={data.therapistCredentials} />
			<ReadOnlyField label="Guardian Name" value={data.guardianName} />
			<ReadOnlyField
				label="Consent Obtained"
				value="Yes"
				className="md:col-span-2"
			/>
			{signedAt && (
				<ReadOnlyField
					label="Signed At"
					value={new Date(signedAt).toLocaleString()}
					className="md:col-span-2"
				/>
			)}
		</AssessmentSectionCard>
	);
}
