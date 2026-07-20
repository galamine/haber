import { z } from "zod";

export const CreateProfileInput = z.object({
	name: z.string().min(1, "Name is required"),
	dateOfBirth: z.string().min(1, "Date of birth is required"),
	district: z.string().min(1, "District is required"),
	state: z.string().min(1, "State is required"),
	phoneNumber: z
		.string()
		.min(1, "Phone number is required")
		.regex(
			/^(\+91[\s-]?)?(91|0)?[6-9]\d{9}$/,
			"Enter a valid 10-digit Indian mobile number",
		),
	photoUrl: z.string().optional(),
});

export const UpdateProfileInput = CreateProfileInput.partial();
