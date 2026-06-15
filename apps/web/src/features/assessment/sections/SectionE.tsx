import { Checkbox } from "@haber-final/ui/components/checkbox";
import { Textarea } from "@haber-final/ui/components/textarea";
import { Controller } from "react-hook-form";

import { FieldWrapper } from "../FieldWrapper";
import { SectionCard } from "../SectionCard";
import type { AssessmentSectionProps } from "../types";

type SectionEProps = AssessmentSectionProps & {
	functionalConcernOptions: { id: string; label: string }[];
};

export function SectionE({
	register,
	control,
	errors,
	functionalConcernOptions,
}: SectionEProps) {
	return (
		<SectionCard title="Section E — Functional & Fine Motor Skills">
			<div className="md:col-span-2">
				<p className="mb-3 font-medium text-on-surface text-sm">
					Areas of Concern
				</p>
				<Controller
					control={control}
					name="sectionE.functionalConcerns"
					render={({ field }) => (
						<div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
							{functionalConcernOptions.map((option) => {
								const checked = field.value.includes(option.id);
								return (
									// biome-ignore lint/a11y/noLabelWithoutControl: Checkbox (Radix) renders an accessible button; label click propagation works correctly
									<label
										key={option.id}
										className="flex cursor-pointer items-start gap-2.5"
									>
										<Checkbox
											checked={checked}
											onCheckedChange={(value) => {
												if (value === true) {
													field.onChange([...field.value, option.id]);
												} else {
													field.onChange(
														field.value.filter((id) => id !== option.id),
													);
												}
											}}
										/>
										<span className="text-on-surface text-sm">
											{option.label}
										</span>
									</label>
								);
							})}
						</div>
					)}
				/>
			</div>

			<FieldWrapper
				label="Clinical Observations & Findings"
				htmlFor="sectionE.observations"
				required
				error={errors.sectionE?.observations?.message}
				className="md:col-span-2"
			>
				<Textarea
					id="sectionE.observations"
					rows={3}
					{...register("sectionE.observations")}
					className={errors.sectionE?.observations ? "border-red-500" : ""}
				/>
			</FieldWrapper>
		</SectionCard>
	);
}
