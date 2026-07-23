import { Slider } from "@haber-final/ui/components/slider";
import { TagInput } from "@haber-final/ui/components/tag-input";
import { Textarea } from "@haber-final/ui/components/textarea";
import { Controller, useFieldArray } from "react-hook-form";
import { AssessmentSectionCard } from "../AssessmentSectionCard";
import { FieldWrapper } from "../FieldWrapper";
import type { AssessmentSectionProps } from "../types";

type SectionDProps = AssessmentSectionProps & {
	sensorySystemById: Record<string, string>;
};

export function SectionD({
	register,
	control,
	errors,
	sensorySystemById,
}: SectionDProps) {
	const { fields } = useFieldArray({
		control,
		name: "sectionD.sensoryProfile",
	});

	return (
		<AssessmentSectionCard title="Section D — Sensory Processing Profile">
			<div className="flex flex-col gap-6 md:col-span-2">
				{fields.map((field, idx) => (
					<div
						key={field.id}
						className="rounded-lg border border-outline-variant p-4"
					>
						<p className="mb-3 font-medium text-on-surface text-sm">
							{sensorySystemById[field.systemId] ?? field.systemId}
						</p>
						<Controller
							control={control}
							name={`sectionD.sensoryProfile.${idx}.rating`}
							render={({ field: sliderField }) => (
								<div className="flex flex-col gap-1.5">
									<Slider
										min={1}
										max={5}
										step={1}
										value={[sliderField.value]}
										onValueChange={([v]) => sliderField.onChange(v)}
									/>
									<div className="flex justify-between text-on-surface-variant text-xs">
										<span>1 = Hypo</span>
										<span>3 = Typical</span>
										<span>5 = Hyper</span>
									</div>
								</div>
							)}
						/>
						<div className="mt-3">
							<Textarea
								rows={2}
								placeholder="Notes…"
								{...register(`sectionD.sensoryProfile.${idx}.notes`)}
							/>
						</div>
					</div>
				))}
			</div>

			<FieldWrapper
				label="Behavioural Observations"
				htmlFor="sectionD.behaviouralObservations"
				required
				error={errors.sectionD?.behaviouralObservations?.message}
				className="md:col-span-2"
			>
				<Controller
					control={control}
					name="sectionD.behaviouralObservations"
					render={({ field }) => (
						<TagInput
							value={field.value}
							onChange={field.onChange}
							placeholder="Type observation...."
						/>
					)}
				/>
			</FieldWrapper>
		</AssessmentSectionCard>
	);
}
