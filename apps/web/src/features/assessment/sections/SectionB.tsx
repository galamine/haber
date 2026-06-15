import { Button } from "@haber-final/ui/components/button";
import { Input } from "@haber-final/ui/components/input";
import { Textarea } from "@haber-final/ui/components/textarea";
import { Plus, Trash2 } from "lucide-react";
import { Controller, useFieldArray } from "react-hook-form";

import { MultiSelectCombobox } from "@/components/multi-select-combobox";

import { FieldWrapper } from "../FieldWrapper";
import { SectionCard } from "../SectionCard";
import type { AssessmentSectionProps } from "../types";

type SectionBProps = AssessmentSectionProps & {
	diagnosisOptions: { value: string; label: string }[];
};

export function SectionB({
	register,
	control,
	errors,
	diagnosisOptions,
}: SectionBProps) {
	const e = errors.sectionB;

	const { fields, append, remove } = useFieldArray({
		control,
		name: "sectionB.previousTherapiesRows",
	});

	return (
		<SectionCard
			title="Section B — Medical & Developmental History"
			description="Diagnoses, pre/peri-natal history, medical background, and previous therapies"
		>
			<FieldWrapper
				label="Primary Diagnoses"
				error={e?.primaryDiagnoses?.message}
				className="md:col-span-2"
			>
				<Controller
					control={control}
					name="sectionB.primaryDiagnoses"
					render={({ field }) => (
						<MultiSelectCombobox
							options={diagnosisOptions}
							value={field.value}
							onChange={field.onChange}
							placeholder="Select diagnoses…"
						/>
					)}
				/>
			</FieldWrapper>

			<FieldWrapper
				label="Prenatal History"
				htmlFor="sectionB.prenatalHistory"
				required
				error={e?.prenatalHistory?.message}
				className="md:col-span-2"
			>
				<Textarea
					id="sectionB.prenatalHistory"
					rows={2}
					{...register("sectionB.prenatalHistory")}
					className={e?.prenatalHistory ? "border-red-500" : ""}
				/>
			</FieldWrapper>

			<FieldWrapper
				label="Birth History / Complications"
				htmlFor="sectionB.birthHistory"
				required
				error={e?.birthHistory?.message}
				className="md:col-span-2"
			>
				<Textarea
					id="sectionB.birthHistory"
					rows={2}
					{...register("sectionB.birthHistory")}
					className={e?.birthHistory ? "border-red-500" : ""}
				/>
			</FieldWrapper>

			<FieldWrapper
				label="Neonatal History"
				htmlFor="sectionB.neonatalHistory"
				required
				error={e?.neonatalHistory?.message}
				className="md:col-span-2"
			>
				<Textarea
					id="sectionB.neonatalHistory"
					rows={2}
					{...register("sectionB.neonatalHistory")}
					className={e?.neonatalHistory ? "border-red-500" : ""}
				/>
			</FieldWrapper>

			<FieldWrapper
				label="Gestational Age at Birth (weeks)"
				htmlFor="sectionB.gestationalAgeWeeks"
				error={e?.gestationalAgeWeeks?.message}
				hint="Typical range: 20–45 weeks"
			>
				<Input
					id="sectionB.gestationalAgeWeeks"
					type="number"
					{...register("sectionB.gestationalAgeWeeks", {
						setValueAs: (v) => (v === "" ? undefined : Number(v)),
					})}
					className={e?.gestationalAgeWeeks ? "border-red-500" : ""}
				/>
			</FieldWrapper>

			<FieldWrapper
				label="Past Medical / Surgical History"
				htmlFor="sectionB.medicalHistory"
				required
				error={e?.medicalHistory?.message}
				className="md:col-span-2"
			>
				<Textarea
					id="sectionB.medicalHistory"
					rows={2}
					{...register("sectionB.medicalHistory")}
					className={e?.medicalHistory ? "border-red-500" : ""}
				/>
			</FieldWrapper>

			<FieldWrapper
				label="Current Medications"
				htmlFor="sectionB.currentMedications"
				required
				error={e?.currentMedications?.message}
			>
				<Textarea
					id="sectionB.currentMedications"
					rows={2}
					{...register("sectionB.currentMedications")}
					className={e?.currentMedications ? "border-red-500" : ""}
				/>
			</FieldWrapper>

			<FieldWrapper
				label="Allergies / Clinical Precautions"
				htmlFor="sectionB.allergies"
				required
				error={e?.allergies?.message}
			>
				<Textarea
					id="sectionB.allergies"
					rows={2}
					{...register("sectionB.allergies")}
					className={e?.allergies ? "border-red-500" : ""}
				/>
			</FieldWrapper>

			<div className="flex flex-col gap-3 md:col-span-2">
				<p className="font-medium text-on-surface text-sm">
					Previous Therapies
				</p>

				{fields.map((field, idx) => (
					<div
						key={field.id}
						className="grid grid-cols-1 gap-3 rounded-lg border border-outline-variant p-4 md:grid-cols-3"
					>
						<FieldWrapper label="Therapy Type">
							<Input
								{...register(
									`sectionB.previousTherapiesRows.${idx}.therapyType`,
								)}
							/>
						</FieldWrapper>
						<FieldWrapper label="Duration / Frequency">
							<Input
								{...register(
									`sectionB.previousTherapiesRows.${idx}.durationFrequency`,
								)}
							/>
						</FieldWrapper>
						<div className="flex items-end gap-2">
							<FieldWrapper label="Provider / Location" className="flex-1">
								<Input
									{...register(
										`sectionB.previousTherapiesRows.${idx}.providerLocation`,
									)}
								/>
							</FieldWrapper>
							<Button
								type="button"
								variant="outline"
								size="icon"
								onClick={() => remove(idx)}
								className="shrink-0 text-red-600 hover:bg-red-50"
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>
					</div>
				))}

				<Button
					type="button"
					variant="outline"
					className="w-full gap-2"
					onClick={() =>
						append({
							therapyType: "",
							durationFrequency: "",
							providerLocation: "",
						})
					}
				>
					<Plus className="h-4 w-4" />
					Add Therapy
				</Button>
			</div>
		</SectionCard>
	);
}
