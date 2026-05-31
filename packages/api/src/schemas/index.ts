import { z } from "zod";

export const UserRoleSchema = z.enum([
	"SUPER_ADMIN",
	"CLINIC_ADMIN",
	"THERAPIST",
	"STAFF",
	"GUARDIAN",
]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export type JwtPayload = {
	sub: string;
	role: UserRole;
	tenantId: string | null;
	familyId: string;
};

export const RequestOtpInput = z.object({
	email: z.string().email(),
});

export const VerifyOtpInput = z.object({
	email: z.string().email(),
	code: z.string().length(6),
});
