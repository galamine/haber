import type { SectionHSchema } from "@haber-final/api/schemas/assessment";
import type { z } from "zod";

import { SectionCard } from "../SectionCard";
import { ReadOnlyField } from "./ReadOnlyField";

type SectionHData = z.infer<typeof SectionHSchema>;

export function ReadOnlySectionH({
	data,
	signedAt,
}: {
	data: SectionHData;
	signedAt?: string | Date;
}) {
	return (
		<SectionCard title="Section H — Signatures & Consent">
			<ReadOnlyField label="Therapist Name" value={data.therapistName} />
			<ReadOnlyField label="Credentials" value={data.therapistCredentials} />
			<ReadOnlyField label="Guardian Name" value={data.guardianName} />
			<ReadOnlyField
				label="Consent Obtained"
				value={data.consentObtained ? "Yes" : "No"}
			/>
			<ReadOnlyField
				label="Signed At"
				value={signedAt ? new Date(signedAt).toLocaleString() : null}
				className="md:col-span-2"
			/>
		</SectionCard>
	);
}
