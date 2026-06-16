import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";

import type { FollowUpFormValues } from "./schema";

export type FollowUpSectionProps = {
	register: UseFormRegister<FollowUpFormValues>;
	control: Control<FollowUpFormValues>;
	errors: FieldErrors<FollowUpFormValues>;
};
