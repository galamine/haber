import { Button } from "@haber-final/ui/components/button";
import { Checkbox } from "@haber-final/ui/components/checkbox";
import { Input } from "@haber-final/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@haber-final/ui/components/select";
import { Textarea } from "@haber-final/ui/components/textarea";
import { Plus, Trash2 } from "lucide-react";
import { Controller, useFieldArray } from "react-hook-form";
import { FieldWrapper } from "../../assessment/FieldWrapper";
import { SectionCard } from "../../assessment/SectionCard";
import {
	GOAL_STATUS_DECISION_OPTIONS,
	NEXT_ASSESSMENT_TYPE_OPTIONS,
} from "../constants";
import type { FollowUpSectionProps } from "../types";

export function SectionE({ register, control, errors }: FollowUpSectionProps) {
	const { fields, append, remove } = useFieldArray({
		control,
		name: "sectionE.updatedGoals",
	});

	const e = errors.sectionE;

	return (
		<SectionCard title="Section E — Plan Adjustments & Next Steps">
			<div className="md:col-span-2">
				<p className="mb-3 font-medium text-on-surface text-sm">
					Goal Status Decisions
				</p>
				<Controller
					control={control}
					name="sectionE.goalStatusDecisions"
					render={({ field }) => (
						<div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
							{GOAL_STATUS_DECISION_OPTIONS.map((option) => {
								const checked = field.value.includes(option.value);
								return (
									// biome-ignore lint/a11y/noLabelWithoutControl: Checkbox (Radix) renders an accessible checkbox; label click propagation works correctly
									<label
										key={option.value}
										className="flex cursor-pointer items-start gap-2.5"
									>
										<Checkbox
											checked={checked}
											onCheckedChange={(value) => {
												if (value === true) {
													field.onChange([...field.value, option.value]);
												} else {
													field.onChange(
														field.value.filter((v) => v !== option.value),
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

			<div className="flex flex-col gap-3 md:col-span-2">
				<p className="font-medium text-on-surface text-sm">Updated Goals</p>

				{fields.map((field, idx) => (
					<div
						key={field.id}
						className="grid grid-cols-1 gap-3 rounded-lg border border-outline-variant p-4 md:grid-cols-[1fr_auto]"
					>
						<FieldWrapper label="Goal Description">
							<Input
								{...register(`sectionE.updatedGoals.${idx}.description`)}
							/>
						</FieldWrapper>
						<div className="flex items-end">
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
							goalId: crypto.randomUUID(),
							description: "",
							targetAttainmentPct: 100,
						})
					}
				>
					<Plus className="h-4 w-4" />
					Add Goal
				</Button>
			</div>

			<FieldWrapper
				label="Updated Home Program"
				htmlFor="sectionE.updatedHomeProgram"
				error={e?.updatedHomeProgram?.message}
				className="md:col-span-2"
			>
				<Textarea
					id="sectionE.updatedHomeProgram"
					rows={3}
					{...register("sectionE.updatedHomeProgram")}
					className={e?.updatedHomeProgram ? "border-red-500" : ""}
				/>
			</FieldWrapper>

			<FieldWrapper
				label="Next Follow-Up Date"
				htmlFor="sectionE.nextFollowUpDate"
				error={e?.nextFollowUpDate?.message}
			>
				<Input
					id="sectionE.nextFollowUpDate"
					type="date"
					{...register("sectionE.nextFollowUpDate")}
					className={e?.nextFollowUpDate ? "border-red-500" : ""}
				/>
			</FieldWrapper>

			<FieldWrapper
				label="Next Assessment Type"
				htmlFor="sectionE.nextAssessmentType"
				error={e?.nextAssessmentType?.message}
			>
				<Controller
					control={control}
					name="sectionE.nextAssessmentType"
					render={({ field }) => (
						<Select value={field.value} onValueChange={field.onChange}>
							<SelectTrigger
								id="sectionE.nextAssessmentType"
								className={e?.nextAssessmentType ? "border-red-500" : ""}
							>
								<SelectValue placeholder="Select type" />
							</SelectTrigger>
							<SelectContent>
								{NEXT_ASSESSMENT_TYPE_OPTIONS.map((option) => (
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
				label="Clinical Notes"
				htmlFor="sectionE.clinicalNotes"
				error={e?.clinicalNotes?.message}
				className="md:col-span-2"
			>
				<Textarea
					id="sectionE.clinicalNotes"
					rows={4}
					{...register("sectionE.clinicalNotes")}
					className={e?.clinicalNotes ? "border-red-500" : ""}
				/>
			</FieldWrapper>
		</SectionCard>
	);
}
