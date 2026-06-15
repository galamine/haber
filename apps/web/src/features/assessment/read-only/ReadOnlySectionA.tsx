import type { SectionASchema } from "@haber-final/api/schemas/assessment";
import type { z } from "zod";

import { SectionCard } from "../SectionCard";
import { ReadOnlyField } from "./ReadOnlyField";

type SectionAData = z.infer<typeof SectionASchema>;

export function ReadOnlySectionA({ data }: { data: SectionAData }) {
	return (
		<SectionCard title="Section A — Patient & Referral Information">
			<ReadOnlyField label="Patient Name" value={data.patientName} />
			<ReadOnlyField label="Date of Birth" value={data.dob} />
			<ReadOnlyField
				label="Age"
				value={`${data.age.years} yrs, ${data.age.months} mo`}
			/>
			<ReadOnlyField label="Gender" value={data.gender} />
			<ReadOnlyField label="Date of Assessment" value={data.assessmentDate} />
			<ReadOnlyField label="Assessment Location" value={data.location} />
			<ReadOnlyField
				label="Referring Therapist / Doctor"
				value={data.referringTherapist}
			/>
			<ReadOnlyField label="Referral Source" value={data.referralSource} />
			<ReadOnlyField
				label="Primary Caregiver Name"
				value={data.caregiverName}
			/>
			<ReadOnlyField
				label="Relationship to Child"
				value={data.caregiverRelation}
			/>
			<ReadOnlyField label="Contact Number" value={data.caregiverContact} />
			<ReadOnlyField label="Email Address" value={data.caregiverEmail} />
			<ReadOnlyField
				label="Chief Complaint"
				value={data.chiefComplaint}
				className="md:col-span-2"
			/>
		</SectionCard>
	);
}
