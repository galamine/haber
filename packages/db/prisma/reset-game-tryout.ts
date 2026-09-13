import "dotenv/config";
import { execSync } from "node:child_process";
import { createPrismaClient } from "../src/index";

// Deletes all game-tryout data (children with opNumber starting "TRYOUT-")
// previously created by seed-game-tryout.ts for the given therapist, then
// reruns that seed script for a clean slate.

const therapistUserId = process.argv[2];

if (!therapistUserId) {
	console.error("Usage: tsx prisma/reset-game-tryout.ts <therapistUserId>");
	process.exit(1);
}

const prisma = createPrismaClient();

const assignments = await prisma.childTherapistAssignment.findMany({
	where: { therapistId: therapistUserId },
	select: { childId: true },
});

const tryoutChildren = await prisma.child.findMany({
	where: {
		id: { in: assignments.map((a) => a.childId) },
		opNumber: { startsWith: "TRYOUT-" },
	},
	select: { id: true, opNumber: true },
});

if (tryoutChildren.length === 0) {
	console.log("Nothing to clean up.");
} else {
	await prisma.$transaction(async (tx) => {
		for (const { id: childId, opNumber } of tryoutChildren) {
			await tx.sessionGameAssignment.deleteMany({
				where: { session: { childId } },
			});
			await tx.gameResult.deleteMany({ where: { session: { childId } } });
			await tx.therapySession.deleteMany({ where: { childId } });
			await tx.sensoryProfile.deleteMany({
				where: { assessment: { childId } },
			});
			await tx.initialAssessment.deleteMany({ where: { childId } });
			await tx.treatmentPlan.deleteMany({ where: { childId } });
			await tx.childTherapistAssignment.deleteMany({ where: { childId } });
			await tx.consentRecord.deleteMany({ where: { childId } });
			await tx.guardian.deleteMany({ where: { childId } });
			await tx.child.delete({ where: { id: childId } });

			console.log(`Deleted tryout child ${childId} (${opNumber})`);
		}
	});
}

await prisma.$disconnect();

console.log("Cleanup complete, reseeding...");
execSync(`pnpm --filter @haber-final/db seed:game-tryout ${therapistUserId}`, {
	stdio: "inherit",
});
