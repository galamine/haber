import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@haber-final/ui/components/select";
import { Slider } from "@haber-final/ui/components/slider";
import { Textarea } from "@haber-final/ui/components/textarea";
import { Controller, useFieldArray } from "react-hook-form";
import { FieldWrapper } from "../../assessment/FieldWrapper";
import { SectionCard } from "../../assessment/SectionCard";
import { GOAL_STATUS_OPTIONS } from "../constants";
import type { FollowUpSectionProps } from "../types";

type SectionBProps = FollowUpSectionProps & {
	goalDescriptionById: Record<string, string>;
};

export function SectionB({
	register,
	control,
	goalDescriptionById,
}: SectionBProps) {
	const { fields } = useFieldArray({
		control,
		name: "sectionB.goalProgress",
	});

	if (fields.length === 0) {
		return (
			<SectionCard title="Section B — Goal Progress Review">
				<div className="rounded-lg border border-outline-variant p-6 text-center md:col-span-2">
					<p className="text-on-surface-variant text-sm">
						No active treatment plan goals found. Goals will auto-populate once
						an active plan with goals is configured.
					</p>
				</div>
			</SectionCard>
		);
	}

	return (
		<SectionCard title="Section B — Goal Progress Review">
			<div className="flex flex-col gap-6 md:col-span-2">
				{fields.map((field, idx) => (
					<div
						key={field.id}
						className="rounded-lg border border-outline-variant p-4"
					>
						<p className="mb-3 font-medium text-on-surface text-sm">
							{goalDescriptionById[field.goalId] ?? field.goalId}
						</p>

						<FieldWrapper
							label="Attainment %"
							htmlFor={`sectionB.goalProgress.${idx}.attainmentPct`}
							className="mb-3"
						>
							<div className="flex items-center gap-4">
								<Controller
									control={control}
									name={`sectionB.goalProgress.${idx}.attainmentPct`}
									render={({ field: sliderField }) => (
										<Slider
											min={0}
											max={100}
											step={1}
											value={[sliderField.value ?? 0]}
											onValueChange={([v]) => sliderField.onChange(v)}
											className="flex-1"
										/>
									)}
								/>
								<span className="w-12 text-center font-medium text-sm">
									{/* Will be filled by watched value */}
									{fields[idx]?.attainmentPct ?? 0}%
								</span>
							</div>
						</FieldWrapper>

						<FieldWrapper
							label="Status"
							htmlFor={`sectionB.goalProgress.${idx}.status`}
							className="mb-3"
						>
							<Controller
								control={control}
								name={`sectionB.goalProgress.${idx}.status`}
								render={({ field }) => (
									<Select value={field.value} onValueChange={field.onChange}>
										<SelectTrigger id={`sectionB.goalProgress.${idx}.status`}>
											<SelectValue placeholder="Select status" />
										</SelectTrigger>
										<SelectContent>
											{GOAL_STATUS_OPTIONS.map((option) => (
												<SelectItem key={option.value} value={option.value}>
													{option.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
						</FieldWrapper>

						<FieldWrapper
							label="Evidence Notes"
							htmlFor={`sectionB.goalProgress.${idx}.evidenceNotes`}
						>
							<Textarea
								id={`sectionB.goalProgress.${idx}.evidenceNotes`}
								rows={2}
								placeholder="Document evidence of progress…"
								{...register(`sectionB.goalProgress.${idx}.evidenceNotes`)}
							/>
						</FieldWrapper>
					</div>
				))}
			</div>
		</SectionCard>
	);
}
