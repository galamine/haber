import { Input } from "@haber-final/ui/components/input";
import { Textarea } from "@haber-final/ui/components/textarea";

import { FieldWrapper } from "../FieldWrapper";
import { SectionCard } from "../SectionCard";
import type { AssessmentSectionProps } from "../types";

export function SectionA({ register, errors }: AssessmentSectionProps) {
	const e = errors.sectionA;

	return (
		<SectionCard
			title="Section A — Patient & Referral Information"
			description="Patient identity, referral details, and presenting complaint"
		>
			<FieldWrapper
				label="Patient Name"
				htmlFor="sectionA.patientName"
				required
				error={e?.patientName?.message}
			>
				<Input
					id="sectionA.patientName"
					{...register("sectionA.patientName")}
					className={e?.patientName ? "border-red-500" : ""}
				/>
			</FieldWrapper>

			<FieldWrapper
				label="Date of Birth"
				htmlFor="sectionA.dob"
				required
				error={e?.dob?.message}
			>
				<Input
					id="sectionA.dob"
					type="date"
					{...register("sectionA.dob")}
					className={e?.dob ? "border-red-500" : ""}
				/>
			</FieldWrapper>

			<FieldWrapper label="Age">
				<div className="flex items-center gap-2">
					<Input
						type="number"
						aria-label="Age in years"
						{...register("sectionA.age.years", { valueAsNumber: true })}
						className={e?.age?.years ? "border-red-500" : ""}
					/>
					<span className="text-on-surface-variant text-sm">yrs</span>
					<Input
						type="number"
						aria-label="Age in months"
						{...register("sectionA.age.months", { valueAsNumber: true })}
						className={e?.age?.months ? "border-red-500" : ""}
					/>
					<span className="text-on-surface-variant text-sm">mo</span>
				</div>
			</FieldWrapper>

			<FieldWrapper
				label="Gender"
				htmlFor="sectionA.gender"
				required
				error={e?.gender?.message}
			>
				<Input
					id="sectionA.gender"
					{...register("sectionA.gender")}
					className={e?.gender ? "border-red-500" : ""}
				/>
			</FieldWrapper>

			<FieldWrapper
				label="Date of Assessment"
				htmlFor="sectionA.assessmentDate"
				required
				error={e?.assessmentDate?.message}
			>
				<Input
					id="sectionA.assessmentDate"
					type="date"
					{...register("sectionA.assessmentDate")}
					className={e?.assessmentDate ? "border-red-500" : ""}
				/>
			</FieldWrapper>

			<FieldWrapper
				label="Assessment Location"
				htmlFor="sectionA.location"
				required
				error={e?.location?.message}
			>
				<Input
					id="sectionA.location"
					{...register("sectionA.location")}
					className={e?.location ? "border-red-500" : ""}
				/>
			</FieldWrapper>

			<FieldWrapper
				label="Referring Therapist / Doctor"
				htmlFor="sectionA.referringTherapist"
				required
				error={e?.referringTherapist?.message}
			>
				<Input
					id="sectionA.referringTherapist"
					{...register("sectionA.referringTherapist")}
					className={e?.referringTherapist ? "border-red-500" : ""}
				/>
			</FieldWrapper>

			<FieldWrapper
				label="Referral Source"
				htmlFor="sectionA.referralSource"
				required
				error={e?.referralSource?.message}
			>
				<Input
					id="sectionA.referralSource"
					{...register("sectionA.referralSource")}
					className={e?.referralSource ? "border-red-500" : ""}
				/>
			</FieldWrapper>

			<FieldWrapper
				label="Primary Caregiver Name"
				htmlFor="sectionA.caregiverName"
				required
				error={e?.caregiverName?.message}
			>
				<Input
					id="sectionA.caregiverName"
					{...register("sectionA.caregiverName")}
					className={e?.caregiverName ? "border-red-500" : ""}
				/>
			</FieldWrapper>

			<FieldWrapper
				label="Relationship to Child"
				htmlFor="sectionA.caregiverRelation"
				required
				error={e?.caregiverRelation?.message}
			>
				<Input
					id="sectionA.caregiverRelation"
					{...register("sectionA.caregiverRelation")}
					className={e?.caregiverRelation ? "border-red-500" : ""}
				/>
			</FieldWrapper>

			<FieldWrapper
				label="Contact Number"
				htmlFor="sectionA.caregiverContact"
				required
				error={e?.caregiverContact?.message}
			>
				<Input
					id="sectionA.caregiverContact"
					{...register("sectionA.caregiverContact")}
					className={e?.caregiverContact ? "border-red-500" : ""}
				/>
			</FieldWrapper>

			<FieldWrapper
				label="Email Address"
				htmlFor="sectionA.caregiverEmail"
				required
				error={e?.caregiverEmail?.message}
			>
				<Input
					id="sectionA.caregiverEmail"
					type="email"
					{...register("sectionA.caregiverEmail")}
					className={e?.caregiverEmail ? "border-red-500" : ""}
				/>
			</FieldWrapper>

			<FieldWrapper
				label="Chief Complaint"
				htmlFor="sectionA.chiefComplaint"
				required
				error={e?.chiefComplaint?.message}
				className="md:col-span-2"
			>
				<Textarea
					id="sectionA.chiefComplaint"
					rows={3}
					{...register("sectionA.chiefComplaint")}
					className={e?.chiefComplaint ? "border-red-500" : ""}
				/>
			</FieldWrapper>
		</SectionCard>
	);
}
