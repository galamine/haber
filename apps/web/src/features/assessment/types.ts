import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";

import type { AssessmentFormValues } from "./schema";

export type AssessmentSectionProps = {
	register: UseFormRegister<AssessmentFormValues>;
	control: Control<AssessmentFormValues>;
	errors: FieldErrors<AssessmentFormValues>;
};
