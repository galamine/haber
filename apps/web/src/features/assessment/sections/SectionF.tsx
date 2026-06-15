import { Checkbox } from "@haber-final/ui/components/checkbox";
import { Textarea } from "@haber-final/ui/components/textarea";
import { useFieldArray } from "react-hook-form";

import { FieldWrapper } from "../FieldWrapper";
import { SectionCard } from "../SectionCard";
import type { AssessmentSectionProps } from "../types";

type SectionFProps = AssessmentSectionProps & {
	assessmentToolOptions: { id: string; label: string }[];
};

export function SectionF({
	register,
	control,
	errors,
	assessmentToolOptions,
}: SectionFProps) {
	const { fields, append, remove } = useFieldArray({
		control,
		name: "sectionF.toolsAdministered",
	});

	return (
		<SectionCard title="Section F — Standardized Assessment Tools">
			<div className="flex flex-col gap-2.5 md:col-span-2">
				{assessmentToolOptions.map((tool) => {
					const idx = fields.findIndex((f) => f.toolId === tool.id);
					const checked = idx !== -1;

					return (
						<div
							key={tool.id}
							className="rounded-lg border border-outline-variant p-3"
						>
							{/* biome-ignore lint/a11y/noLabelWithoutControl: Checkbox (Radix) renders an accessible button; label click propagation works correctly */}
							<label className="flex cursor-pointer items-start gap-2.5">
								<Checkbox
									checked={checked}
									onCheckedChange={(value) => {
										if (value === true) {
											append({ toolId: tool.id, scoresSummary: "" });
										} else if (idx !== -1) {
											remove(idx);
										}
									}}
								/>
								<span className="text-on-surface text-sm">{tool.label}</span>
							</label>
							{checked && (
								<div className="mt-2.5">
									<Textarea
										rows={2}
										placeholder="Scores / summary…"
										{...register(
											`sectionF.toolsAdministered.${idx}.scoresSummary`,
										)}
									/>
								</div>
							)}
						</div>
					);
				})}
			</div>

			<FieldWrapper
				label="Overall Summary"
				htmlFor="sectionF.overallSummary"
				required
				error={errors.sectionF?.overallSummary?.message}
				className="md:col-span-2"
			>
				<Textarea
					id="sectionF.overallSummary"
					rows={3}
					{...register("sectionF.overallSummary")}
					className={errors.sectionF?.overallSummary ? "border-red-500" : ""}
				/>
			</FieldWrapper>
		</SectionCard>
	);
}
