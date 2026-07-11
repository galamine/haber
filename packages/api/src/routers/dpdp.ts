import prisma from "@haber-final/db";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../index";
import { ChildListInput } from "../schemas/child";

interface RetentionChild {
	id: string;
	fullName: string;
	opNumber: string;
	dob: Date;
	deletedAt: Date | null;
	guardian: {
		id: string;
		name: string;
		relation: string;
		phone: string;
		email: string | null;
	} | null;
}

export const dpdpRouter: ReturnType<typeof router> = router({
	retentionReport: protectedProcedure
		.input(ChildListInput)
		.query(async ({ input, ctx }) => {
			const { role, tenantId } = ctx.auth;
			if (role !== "SUPER_ADMIN" && role !== "CLINIC_ADMIN") {
				throw new TRPCError({ code: "FORBIDDEN" });
			}

			const SEVEN_YEARS_MS = 7 * 365.25 * 24 * 60 * 60 * 1000;
			const now = Date.now();

			const where = {
				...(role !== "SUPER_ADMIN" ? { clinicId: tenantId ?? undefined } : {}),
				deletedAt: { not: null },
			};

			const [items, total] = await prisma.$transaction([
				(prisma.child.findMany as any)({
					where,
					skip: (input.page - 1) * input.pageSize,
					take: input.pageSize,
					orderBy: { deletedAt: "desc" },
					include: { guardian: true },
				}),
				(prisma.child.count as any)({ where }),
			]);

			const mappedItems = items.map((child: RetentionChild) => ({
				id: child.id,
				fullName: child.fullName,
				dob: child.dob,
				opNumber: child.opNumber,
				deletedAt: child.deletedAt,
				retentionExpiresAt: new Date(
					child.deletedAt!.getTime() + SEVEN_YEARS_MS,
				),
				pastRetentionWindow: now - child.deletedAt!.getTime() > SEVEN_YEARS_MS,
			}));

			return {
				items: mappedItems,
				total,
				page: input.page,
				totalPages: Math.ceil(total / input.pageSize),
			};
		}),
});
