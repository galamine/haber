import { Button } from "@haber-final/ui/components/button";
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

import { MultiSelectCombobox } from "@/components/multi-select-combobox";
import { INTERVENTION_SETTINGS } from "../constants";
import { FieldWrapper } from "../FieldWrapper";
import { SectionCard } from "../SectionCard";
import type { AssessmentFormValues } from "../schema";
import type { AssessmentSectionProps } from "../types";

type SectionGProps = AssessmentSectionProps & {
	equipmentOptions: { value: string; label: string }[];
};

function GoalList({
	title,
	name,
	register,
	control,
}: {
	title: string;
	name: "sectionG.shortTermGoals" | "sectionG.longTermGoals";
	register: AssessmentSectionProps["register"];
	control: AssessmentSectionProps["control"];
}) {
	const { fields, append, remove } = useFieldArray({ control, name });

	return (
		<div className="flex flex-col gap-3 md:col-span-2">
			<p className="font-medium text-on-surface text-sm">{title}</p>

			{fields.map((field, idx) => (
				<div
					key={field.id}
					className="grid grid-cols-1 gap-3 rounded-lg border border-outline-variant p-4 md:grid-cols-[1fr_140px_auto]"
				>
					<FieldWrapper label="Goal Description">
						<Input {...register(`${name}.${idx}.description`)} />
					</FieldWrapper>
					<FieldWrapper label="Target Attainment %">
						<Input
							type="number"
							{...register(`${name}.${idx}.targetAttainmentPct`, {
								valueAsNumber: true,
							})}
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
				disabled={fields.length >= 4}
				onClick={() =>
					append({
						goalId: crypto.randomUUID(),
						description: "",
						targetAttainmentPct: 0,
					} satisfies AssessmentFormValues["sectionG"]["shortTermGoals"][number])
				}
			>
				<Plus className="h-4 w-4" />
				Add Goal {fields.length >= 4 ? "(max 4)" : ""}
			</Button>
		</div>
	);
}

export function SectionG({
	register,
	control,
	errors,
	equipmentOptions,
}: SectionGProps) {
	const e = errors.sectionG;

	return (
		<SectionCard title="Section G — Initial Goals & Intervention Plan">
			<GoalList
				title="Short-Term Goals (4–6 weeks)"
				name="sectionG.shortTermGoals"
				register={register}
				control={control}
			/>

			<GoalList
				title="Long-Term Goals (3–6 months)"
				name="sectionG.longTermGoals"
				register={register}
				control={control}
			/>

			<FieldWrapper
				label="Recommended Frequency (sessions/week)"
				htmlFor="sectionG.recommendedFrequency"
				required
				error={e?.recommendedFrequency?.message}
			>
				<Input
					id="sectionG.recommendedFrequency"
					type="number"
					{...register("sectionG.recommendedFrequency", {
						valueAsNumber: true,
					})}
					className={e?.recommendedFrequency ? "border-red-500" : ""}
				/>
			</FieldWrapper>

			<FieldWrapper
				label="Session Duration (minutes)"
				htmlFor="sectionG.sessionDurationMinutes"
				required
				error={e?.sessionDurationMinutes?.message}
			>
				<Input
					id="sectionG.sessionDurationMinutes"
					type="number"
					{...register("sectionG.sessionDurationMinutes", {
						valueAsNumber: true,
					})}
					className={e?.sessionDurationMinutes ? "border-red-500" : ""}
				/>
			</FieldWrapper>

			<FieldWrapper
				label="Intervention Setting"
				htmlFor="sectionG.interventionSetting"
				required
				error={e?.interventionSetting?.message}
			>
				<Controller
					control={control}
					name="sectionG.interventionSetting"
					render={({ field }) => (
						<Select value={field.value} onValueChange={field.onChange}>
							<SelectTrigger
								id="sectionG.interventionSetting"
								className={e?.interventionSetting ? "border-red-500" : ""}
							>
								<SelectValue placeholder="Select setting" />
							</SelectTrigger>
							<SelectContent>
								{INTERVENTION_SETTINGS.map((option) => (
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
				label="Review Period (weeks)"
				htmlFor="sectionG.reviewPeriodWeeks"
				required
				error={e?.reviewPeriodWeeks?.message}
			>
				<Input
					id="sectionG.reviewPeriodWeeks"
					type="number"
					{...register("sectionG.reviewPeriodWeeks", { valueAsNumber: true })}
					className={e?.reviewPeriodWeeks ? "border-red-500" : ""}
				/>
			</FieldWrapper>

			<FieldWrapper
				label="Home Program Recommendations"
				htmlFor="sectionG.homeProgramRecommendations"
				required
				error={e?.homeProgramRecommendations?.message}
				className="md:col-span-2"
			>
				<Textarea
					id="sectionG.homeProgramRecommendations"
					rows={3}
					{...register("sectionG.homeProgramRecommendations")}
					className={e?.homeProgramRecommendations ? "border-red-500" : ""}
				/>
			</FieldWrapper>

			<FieldWrapper
				label="Equipment / Sensory Diet Recommended"
				error={e?.equipment?.message}
				className="md:col-span-2"
			>
				<Controller
					control={control}
					name="sectionG.equipment"
					render={({ field }) => (
						<MultiSelectCombobox
							options={equipmentOptions}
							value={field.value}
							onChange={field.onChange}
							placeholder="Select equipment…"
						/>
					)}
				/>
			</FieldWrapper>

			<FieldWrapper
				label="Referrals to Other Specialists"
				htmlFor="sectionG.referrals"
				required
				error={e?.referrals?.message}
				className="md:col-span-2"
			>
				<Textarea
					id="sectionG.referrals"
					rows={2}
					{...register("sectionG.referrals")}
					className={e?.referrals ? "border-red-500" : ""}
				/>
			</FieldWrapper>
		</SectionCard>
	);
}
