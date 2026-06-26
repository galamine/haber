import { Input } from "@haber-final/ui/components/input";
import { Switch } from "@haber-final/ui/components/switch";
import { Controller } from "react-hook-form";

import { FieldWrapper } from "../../assessment/FieldWrapper";
import { SectionCard } from "../../assessment/SectionCard";
import type { FollowUpSectionProps } from "../types";

type SectionAProps = FollowUpSectionProps & {
	therapistDisplayName: string;
};

export function SectionA({
	register,
	control,
	errors,
	therapistDisplayName,
}: SectionAProps) {
	const e = errors.sectionA;

	return (
		<SectionCard title="Section A — Session Information">
			<FieldWrapper
				label="Date"
				htmlFor="sectionA.date"
				required
				error={e?.date?.message}
			>
				<Input
					id="sectionA.date"
					type="date"
					{...register("sectionA.date")}
					className={e?.date ? "border-red-500" : ""}
				/>
			</FieldWrapper>

			<FieldWrapper label="Therapist">
				<input type="hidden" {...register("sectionA.therapistId")} />
				<p className="pt-2 text-on-surface-variant text-sm">
					{therapistDisplayName}
				</p>
			</FieldWrapper>

			<FieldWrapper
				label="Session Number"
				htmlFor="sectionA.sessionNumber"
				required
				error={e?.sessionNumber?.message}
			>
				<Input
					id="sectionA.sessionNumber"
					type="number"
					{...register("sectionA.sessionNumber", { valueAsNumber: true })}
					className={e?.sessionNumber ? "border-red-500" : ""}
				/>
			</FieldWrapper>

			<FieldWrapper
				label="Weeks Since Initial Assessment"
				htmlFor="sectionA.weeksSinceInitial"
				error={e?.weeksSinceInitial?.message}
			>
				<Input
					id="sectionA.weeksSinceInitial"
					type="number"
					readOnly
					{...register("sectionA.weeksSinceInitial", { valueAsNumber: true })}
					className="cursor-not-allowed bg-muted"
				/>
			</FieldWrapper>

			<FieldWrapper
				label="Parent / Caregiver Present"
				htmlFor="sectionA.parentPresent"
				className="md:col-span-2"
			>
				<div className="flex items-center gap-3 pt-2">
					<Controller
						control={control}
						name="sectionA.parentPresent"
						render={({ field }) => (
							<Switch checked={field.value} onCheckedChange={field.onChange} />
						)}
					/>
					<span className="text-on-surface text-sm">
						{/* Label text is handled by the FieldWrapper */}
					</span>
				</div>
			</FieldWrapper>
		</SectionCard>
	);
}
