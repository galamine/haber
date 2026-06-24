import prisma from "@haber-final/db";
import { TRPCError } from "@trpc/server";

import { protectedProcedure, router } from "../index";
import { CreateProfileInput, UpdateProfileInput } from "../schemas/profile";

export const profileRouter: ReturnType<typeof router> = router({
	get: protectedProcedure.query(async ({ ctx }) => {
		return prisma.userProfile.findUnique({
			where: { userId: ctx.auth.userId },
		});
	}),

	create: protectedProcedure
		.input(CreateProfileInput)
		.mutation(async ({ ctx, input }) => {
			const existing = await prisma.userProfile.findUnique({
				where: { userId: ctx.auth.userId },
			});
			if (existing) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "Profile already exists",
				});
			}

			return prisma.userProfile.create({
				data: {
					userId: ctx.auth.userId,
					name: input.name,
					dateOfBirth: new Date(input.dateOfBirth),
					district: input.district,
					state: input.state,
					phoneNumber: input.phoneNumber,
				},
			});
		}),

	update: protectedProcedure
		.input(UpdateProfileInput)
		.mutation(async ({ ctx, input }) => {
			return prisma.userProfile.upsert({
				where: { userId: ctx.auth.userId },
				create: {
					userId: ctx.auth.userId,
					name: input.name!,
					dateOfBirth: new Date(input.dateOfBirth!),
					district: input.district!,
					state: input.state!,
					phoneNumber: input.phoneNumber!,
				},
				update: {
					...(input.name !== undefined && { name: input.name }),
					...(input.dateOfBirth !== undefined && {
						dateOfBirth: new Date(input.dateOfBirth),
					}),
					...(input.district !== undefined && { district: input.district }),
					...(input.state !== undefined && { state: input.state }),
					...(input.phoneNumber !== undefined && {
						phoneNumber: input.phoneNumber,
					}),
				},
			});
		}),
});
