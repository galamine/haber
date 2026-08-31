import prisma from "@haber-final/db";

type ConflictInput = {
	scheduledDate: Date;
	durationMinutes: number;
	roomId?: string;
	assignedTherapistId?: string;
	excludeSessionId?: string;
};

function overlaps(
	candidate: { scheduledDate: Date; durationMinutes: number },
	newStart: Date,
	newEnd: Date,
) {
	const candidateEnd = new Date(
		candidate.scheduledDate.getTime() + candidate.durationMinutes * 60_000,
	);
	return candidate.scheduledDate < newEnd && newStart < candidateEnd;
}

export async function findConflicts({
	scheduledDate,
	durationMinutes,
	roomId,
	assignedTherapistId,
	excludeSessionId,
}: ConflictInput) {
	const newStart = scheduledDate;
	const newEnd = new Date(scheduledDate.getTime() + durationMinutes * 60_000);

	// Cheap prefilter on the indexed scheduledDate column; exact overlap is
	// filtered in app code below since durationMinutes varies per row and
	// can't be expressed as a computed end-time in a Prisma `where` clause
	// without raw SQL — row counts per room/therapist per day are small.
	const [roomCandidates, therapistCandidates] = await Promise.all([
		roomId
			? prisma.therapySession.findMany({
					where: {
						roomId,
						id: excludeSessionId ? { not: excludeSessionId } : undefined,
						scheduledDate: { lt: newEnd },
					},
					select: {
						id: true,
						scheduledDate: true,
						durationMinutes: true,
						child: { select: { fullName: true } },
					},
				})
			: Promise.resolve([]),
		assignedTherapistId
			? prisma.therapySession.findMany({
					where: {
						assignedTherapistId,
						id: excludeSessionId ? { not: excludeSessionId } : undefined,
						scheduledDate: { lt: newEnd },
					},
					select: {
						id: true,
						scheduledDate: true,
						durationMinutes: true,
						child: { select: { fullName: true } },
					},
				})
			: Promise.resolve([]),
	]);

	return {
		roomConflicts: roomCandidates.filter((c) => overlaps(c, newStart, newEnd)),
		therapistConflicts: therapistCandidates.filter((c) =>
			overlaps(c, newStart, newEnd),
		),
	};
}
