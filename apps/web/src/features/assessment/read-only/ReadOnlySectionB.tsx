import type { SectionBSchema } from "@haber-final/api/schemas/assessment";
import type { z } from "zod";

import { SectionCard } from "../SectionCard";
import { ReadOnlyField } from "./ReadOnlyField";

type SectionBData = z.infer<typeof SectionBSchema>;

export function ReadOnlySectionB({
	data,
	diagnosisById,
}: {
	data: SectionBData;
	diagnosisById: Record<string, string>;
}) {
	const diagnosisLabels = data.primaryDiagnoses
		.map((id) => diagnosisById[id] ?? id)
		.join(", ");

	return (
		<SectionCard title="Section B — Medical & Developmental History">
			<ReadOnlyField
				label="Primary Diagnoses"
				value={diagnosisLabels}
				className="md:col-span-2"
			/>
			<ReadOnlyField
				label="Prenatal History"
				value={data.prenatalHistory}
				className="md:col-span-2"
			/>
			<ReadOnlyField
				label="Birth History / Complications"
				value={data.birthHistory}
				className="md:col-span-2"
			/>
			<ReadOnlyField
				label="Neonatal History"
				value={data.neonatalHistory}
				className="md:col-span-2"
			/>
			<ReadOnlyField
				label="Gestational Age at Birth (weeks)"
				value={data.gestationalAgeWeeks}
			/>
			<ReadOnlyField
				label="Past Medical / Surgical History"
				value={data.medicalHistory}
				className="md:col-span-2"
			/>
			<ReadOnlyField
				label="Current Medications"
				value={data.currentMedications}
			/>
			<ReadOnlyField
				label="Allergies / Clinical Precautions"
				value={data.allergies}
			/>
			<ReadOnlyField
				label="Previous Therapies"
				value={
					data.previousTherapies ? (
						<span className="whitespace-pre-line">
							{data.previousTherapies}
						</span>
					) : null
				}
				className="md:col-span-2"
			/>
		</SectionCard>
	);
}
