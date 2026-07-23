import {
	RadioGroup,
	RadioGroupItem,
} from "@haber-final/ui/components/radio-group";
import { TagInput } from "@haber-final/ui/components/tag-input";
import { Textarea } from "@haber-final/ui/components/textarea";
import { Controller } from "react-hook-form";
import { MultiSelectCombobox } from "@/components/multi-select-combobox";
import { AssessmentSectionCard } from "../../assessment/AssessmentSectionCard";
import { FieldWrapper } from "../../assessment/FieldWrapper";
import { COMPLIANCE_OPTIONS, ENGAGEMENT_OPTIONS } from "../constants";
import type { FollowUpSectionProps } from "../types";

type SectionDProps = FollowUpSectionProps & {
	equipmentOptions: { value: string; label: string }[];
};

export function SectionD({
	register,
	control,
	errors,
	equipmentOptions,
}: SectionDProps) {
	const e = errors.sectionD;

	return (
		<AssessmentSectionCard title="Section D — Follow-Up Clinical Questions">
			<FieldWrapper
				label="Improvements at Home"
				htmlFor="sectionD.improvementsAtHome"
				error={e?.improvementsAtHome?.message}
				className="md:col-span-2"
			>
				<Controller
					control={control}
					name="sectionD.improvementsAtHome"
					render={({ field }) => (
						<TagInput
							value={field.value ?? []}
							onChange={field.onChange}
							placeholder="What improvements did you notice at home?"
						/>
					)}
				/>
			</FieldWrapper>

			<FieldWrapper
				label="Improvements at School"
				htmlFor="sectionD.improvementsAtSchool"
				error={e?.improvementsAtSchool?.message}
				className="md:col-span-2"
			>
				<Controller
					control={control}
					name="sectionD.improvementsAtSchool"
					render={({ field }) => (
						<TagInput
							value={field.value ?? []}
							onChange={field.onChange}
							placeholder="What improvements were observed at school?"
						/>
					)}
				/>
			</FieldWrapper>

			<FieldWrapper
				label="Regression(s) Noted"
				htmlFor="sectionD.regressions"
				error={e?.regressions?.message}
				className="md:col-span-2"
			>
				<Textarea
					id="sectionD.regressions"
					rows={2}
					{...register("sectionD.regressions")}
					className={e?.regressions ? "border-red-500" : ""}
				/>
			</FieldWrapper>

			<FieldWrapper
				label="Home Program Compliance"
				htmlFor="sectionD.homeProgramCompliance"
				required
				error={e?.homeProgramCompliance?.message}
			>
				<Controller
					control={control}
					name="sectionD.homeProgramCompliance"
					render={({ field }) => (
						<RadioGroup
							value={field.value}
							onValueChange={field.onChange}
							className="flex flex-col gap-2"
						>
							{COMPLIANCE_OPTIONS.map((option) => (
								// biome-ignore lint/a11y/noLabelWithoutControl: RadioGroupItem (Radix) renders an accessible radio; label association is implicit
								<label
									key={option.value}
									className="flex cursor-pointer items-center gap-2"
								>
									<RadioGroupItem value={option.value} />
									<span className="text-on-surface text-sm">
										{option.label}
									</span>
								</label>
							))}
						</RadioGroup>
					)}
				/>
			</FieldWrapper>

			<FieldWrapper
				label="Session Engagement"
				htmlFor="sectionD.sessionEngagement"
				required
				error={e?.sessionEngagement?.message}
			>
				<Controller
					control={control}
					name="sectionD.sessionEngagement"
					render={({ field }) => (
						<RadioGroup
							value={field.value}
							onValueChange={field.onChange}
							className="flex flex-col gap-2"
						>
							{ENGAGEMENT_OPTIONS.map((option) => (
								// biome-ignore lint/a11y/noLabelWithoutControl: RadioGroupItem (Radix) renders an accessible radio; label association is implicit
								<label
									key={option.value}
									className="flex cursor-pointer items-center gap-2"
								>
									<RadioGroupItem value={option.value} />
									<span className="text-on-surface text-sm">
										{option.label}
									</span>
								</label>
							))}
						</RadioGroup>
					)}
				/>
			</FieldWrapper>

			<FieldWrapper
				label="School Performance Changes"
				htmlFor="sectionD.schoolPerformanceChanges"
				error={e?.schoolPerformanceChanges?.message}
				className="md:col-span-2"
			>
				<Controller
					control={control}
					name="sectionD.schoolPerformanceChanges"
					render={({ field }) => (
						<TagInput
							value={field.value ?? []}
							onChange={field.onChange}
							placeholder="Describe any school performance changes"
						/>
					)}
				/>
			</FieldWrapper>

			<FieldWrapper
				label="Behaviour Changes"
				htmlFor="sectionD.behaviourChanges"
				error={e?.behaviourChanges?.message}
				className="md:col-span-2"
			>
				<Controller
					control={control}
					name="sectionD.behaviourChanges"
					render={({ field }) => (
						<TagInput
							value={field.value ?? []}
							onChange={field.onChange}
							placeholder="Describe any behaviour changes observed"
						/>
					)}
				/>
			</FieldWrapper>

			<FieldWrapper
				label="New Skills Observed"
				htmlFor="sectionD.newSkillsObserved"
				error={e?.newSkillsObserved?.message}
				className="md:col-span-2"
			>
				<Controller
					control={control}
					name="sectionD.newSkillsObserved"
					render={({ field }) => (
						<TagInput
							value={field.value ?? []}
							onChange={field.onChange}
							placeholder="List any new skills the child learned"
						/>
					)}
				/>
			</FieldWrapper>

			<FieldWrapper
				label="Equipment Effectively Used"
				htmlFor="sectionD.equipmentEffectivelyUsed"
				error={e?.equipmentEffectivelyUsed?.message}
				className="md:col-span-2"
			>
				<Controller
					control={control}
					name="sectionD.equipmentEffectivelyUsed"
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
				label="Therapist Observations"
				htmlFor="sectionD.therapistObservations"
				error={e?.therapistObservations?.message}
				className="md:col-span-2"
			>
				<Controller
					control={control}
					name="sectionD.therapistObservations"
					render={({ field }) => (
						<TagInput
							value={field.value ?? []}
							onChange={field.onChange}
							placeholder="Add any clinical observations"
						/>
					)}
				/>
			</FieldWrapper>
		</AssessmentSectionCard>
	);
}
