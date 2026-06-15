import { Checkbox } from "@haber-final/ui/components/checkbox";
import { Input } from "@haber-final/ui/components/input";
import { Controller } from "react-hook-form";

import { FieldWrapper } from "../FieldWrapper";
import { SectionCard } from "../SectionCard";
import type { AssessmentSectionProps } from "../types";

type SectionHProps = AssessmentSectionProps & {
	therapistCredentials?: string;
};

export function SectionH({
	register,
	control,
	errors,
	therapistCredentials,
}: SectionHProps) {
	const e = errors.sectionH;

	return (
		<SectionCard title="Section H — Signatures & Consent">
			<FieldWrapper
				label="Therapist Name"
				htmlFor="sectionH.therapistName"
				required
				error={e?.therapistName?.message}
			>
				<Input
					id="sectionH.therapistName"
					{...register("sectionH.therapistName")}
					className={e?.therapistName ? "border-red-500" : ""}
				/>
			</FieldWrapper>

			<FieldWrapper label="Credentials">
				<p className="pt-2 text-on-surface-variant text-sm">
					{therapistCredentials || "—"}
				</p>
			</FieldWrapper>

			<FieldWrapper
				label="Guardian Name"
				htmlFor="sectionH.guardianName"
				required
				error={e?.guardianName?.message}
			>
				<Input
					id="sectionH.guardianName"
					{...register("sectionH.guardianName")}
					className={e?.guardianName ? "border-red-500" : ""}
				/>
			</FieldWrapper>

			<FieldWrapper label="Signed At">
				<p className="pt-2 text-on-surface-variant text-sm">
					Recorded automatically at submission
				</p>
			</FieldWrapper>

			<div className="flex flex-col gap-1.5 md:col-span-2">
				<Controller
					control={control}
					name="sectionH.consentObtained"
					render={({ field }) => (
						// biome-ignore lint/a11y/noLabelWithoutControl: Checkbox (Radix) renders an accessible button; label click propagation works correctly
						<label className="flex cursor-pointer items-start gap-2.5">
							<Checkbox
								checked={field.value}
								onCheckedChange={(checked) => field.onChange(checked === true)}
							/>
							<span className="text-on-surface text-sm">
								I confirm that consent for assessment and treatment has been
								obtained from the guardian.{" "}
								<span className="text-red-500">*</span>
							</span>
						</label>
					)}
				/>
				{e?.consentObtained && (
					<p className="text-red-600 text-xs">Consent is required.</p>
				)}
			</div>
		</SectionCard>
	);
}
