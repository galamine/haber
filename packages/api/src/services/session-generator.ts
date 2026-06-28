import { randomUUID } from "node:crypto";

import prisma from "@haber-final/db";

export async function generateSessionsForPlan(planId: string) {
	const plan = await prisma.treatmentPlan.findUniqueOrThrow({
		where: { id: planId },
		include: {
			gameAssignments: { orderBy: { order: "asc" } },
		},
	});

	if (!plan.startDate) {
		throw new Error("Plan has no start date");
	}

	const maxFrequency = Math.max(
		...plan.gameAssignments.map((a) => a.frequencyPerWeek ?? 1),
		1,
	);

	const batch: {
		planId: string;
		childId: string;
		assignedTherapistId: string;
		scheduledDate: Date;
		status: "PENDING";
		webhookSecret: string;
	}[] = [];

	const totalSessions = maxFrequency * plan.programLengthWeeks;

	for (let week = 0; week < plan.programLengthWeeks; week++) {
		for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
			const sessionIndex = week * 5 + dayOffset;
			if (sessionIndex >= totalSessions) {
				break;
			}
			const scheduledDate = new Date(plan.startDate);
			scheduledDate.setDate(scheduledDate.getDate() + week * 7 + dayOffset);

			batch.push({
				planId: plan.id,
				childId: plan.childId,
				assignedTherapistId: plan.createdById,
				scheduledDate,
				status: "PENDING",
				webhookSecret: randomUUID(),
			});
		}
	}

	const createdSessions = await prisma.therapySession.createManyAndReturn({
		data: batch,
	});

	await prisma.sessionGameAssignment.createMany({
		data: plan.gameAssignments.flatMap((assignment) =>
			createdSessions.map((s) => ({
				sessionId: s.id,
				gameVersionId: assignment.gameVersionId,
				durationSeconds: assignment.durationSeconds,
				repetitions: assignment.repetitions,
				instructions: assignment.instructions,
				order: assignment.order,
			})),
		),
	});

	return createdSessions;
}

export async function regenerateFutureSessions(
	oldPlanId: string,
	newPlanId: string,
	fromDate: Date,
) {
	await prisma.therapySession.deleteMany({
		where: {
			planId: oldPlanId,
			status: "PENDING",
			scheduledDate: { gte: fromDate },
		},
	});

	return generateSessionsForPlan(newPlanId);
}
