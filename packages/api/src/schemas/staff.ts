import { z } from "zod";

export const PERMISSIONS = {
	CHILD_INTAKE: "child.intake",
	SESSION_RUN: "session.run",
	TREATMENT_PLAN_MODIFY: "treatment_plan.modify",
} as const;

export const StaffRoleSchema = z.enum(["THERAPIST", "STAFF"]);

export const InviteStaffInput = z.object({
	email: z.string().email(),
	role: StaffRoleSchema,
	permissions: z.array(z.string()).default([]),
	departmentIds: z.array(z.string()).default([]),
});

export const UpdatePermissionsInput = z.object({
	userId: z.string(),
	permissions: z.array(z.string()),
});

export const AssignDepartmentsInput = z.object({
	userId: z.string(),
	departmentIds: z.array(z.string()),
});

export const StaffListInput = z.object({
	page: z.number().int().positive().default(1),
	pageSize: z.number().int().positive().max(100).default(20),
	role: StaffRoleSchema.optional(),
	departmentId: z.string().optional(),
});

export const UpdateCredentialsInput = z.object({
	userId: z.string(),
	credentialsQualifications: z.string().optional(),
	credentialsRegistrationNumber: z.string().optional(),
});
