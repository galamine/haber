import { z } from "zod";

export const CreateProfileInput = z.object({
	name: z.string().min(1, "Name is required"),
	dateOfBirth: z.string().min(1, "Date of birth is required"),
	district: z.string().min(1, "District is required"),
	state: z.string().min(1, "State is required"),
	phoneNumber: z.string().min(1, "Phone number is required"),
	photoUrl: z.string().optional(),
});

export const UpdateProfileInput = CreateProfileInput.partial();
