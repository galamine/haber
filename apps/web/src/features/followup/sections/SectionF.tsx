import { Checkbox } from "@haber-final/ui/components/checkbox";
import { Input } from "@haber-final/ui/components/input";
import { Controller } from "react-hook-form";

import { FieldWrapper } from "../FieldWrapper";
import { SectionCard } from "../SectionCard";
import type { FollowUpSectionProps } from "../types";

type SectionFProps = FollowUpSectionProps & {
	therapistCredentials?: string;
};

export function SectionF({
	register,
	control,
	errors,
	therapistCredentials,
}: SectionFProps) {
	const e = errors.sectionF;

	return (
		<SectionCard title="Section F — Signatures & Consent">
			<FieldWrapper
				label="Therapist Name"
				htmlFor="sectionF.therapistName"
				required
				error={e?.therapistName?.message}
			>
				<Input
					id="sectionF.therapistName"
					{...register("sectionF.therapistName")}
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
				htmlFor="sectionF.guardianName"
				required
				error={e?.guardianName?.message}
			>
				<Input
					id="sectionF.guardianName"
					{...register("sectionF.guardianName")}
					className={e?.guardianName ? "border-red-500" : ""}
				/>
			</FieldWrapper>

			<div className="flex flex-col gap-1.5 md:col-span-2">
				<Controller
					control={control}
					name="sectionF.consentObtained"
					render={({ field }) => (
						// biome-ignore lint/a11y/noLabelWithoutControl: Checkbox (Radix) renders an accessible checkbox; label click propagation works correctly
						<label className="flex cursor-pointer items-start gap-2.5">
							<Checkbox
								checked={field.value}
								onCheckedChange={(checked) => field.onChange(checked === true)}
							/>
							<span className="text-on-surface text-sm">
								I confirm the information in this follow-up assessment is
								accurate to my clinical judgment. Progress and updated plan have
								been discussed with the caregiver (if present).{" "}
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
