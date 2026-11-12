import "dotenv/config";
import { createPrismaClient } from "../src/index";

// Creates one child (with completed intake, initial assessment, and an
// active treatment plan) for the given therapist, then schedules 3 sessions
// per game in the catalog so every game can be tried on a real device.
// Not idempotent — each run creates a fresh child and a fresh set of sessions.

const therapistUserId = process.argv[2];

if (!therapistUserId) {
	console.error("Usage: tsx prisma/seed-game-tryout.ts <therapistUserId>");
	process.exit(1);
}

const prisma = createPrismaClient();

const therapist = await prisma.user.findUniqueOrThrow({
	where: { id: therapistUserId },
	include: { profile: true },
});

const therapistName = therapist.profile?.name ?? therapist.email;

if (therapist.role !== "THERAPIST") {
	console.error(
		`User ${therapistUserId} has role ${therapist.role}, not THERAPIST.`,
	);
	process.exit(1);
}

if (!therapist.clinicId) {
	console.error(`User ${therapistUserId} has no clinicId.`);
	process.exit(1);
}

const clinicId = therapist.clinicId;

let room = await prisma.sensoryRoom.findFirst({
	where: { clinicId, status: "ACTIVE" },
});

if (!room) {
	room = await prisma.sensoryRoom.create({
		data: {
			clinicId,
			code: "TRYOUT-ROOM",
			name: "Game Tryout Room",
			status: "ACTIVE",
		},
	});
}

const sensorySystems = await prisma.sensorySystem.findMany({
	orderBy: { order: "asc" },
	take: 7,
});

if (sensorySystems.length < 7) {
	console.error(
		`Only ${sensorySystems.length} sensory systems found; need 7. Run the clinical seed first (pnpm --filter @haber-final/db seed:clinical).`,
	);
	process.exit(1);
}

const runId = Date.now().toString(36);

const { child } = await prisma.$transaction(async (tx) => {
	const child = await tx.child.create({
		data: {
			clinicId,
			opNumber: `TRYOUT-${runId}`,
			fullName: "Game Tryout Child",
			dob: new Date("2018-01-01"),
			sex: "Other",
			spokenLanguages: ["English"],
			consentStatus: "GRANTED",
		},
	});

	await tx.guardian.create({
		data: {
			childId: child.id,
			name: "Game Tryout Guardian",
			relation: "Parent",
			phone: "9999999999",
			email: `tryout-guardian-${runId}@example.com`,
		},
	});

	for (const consentType of [
		"TREATMENT",
		"DATA_PROCESSING",
		"IMAGE_VIDEO_CAPTURE",
	] as const) {
		await tx.consentRecord.create({
			data: {
				childId: child.id,
				consentType,
				typedName: "Game Tryout Guardian",
				checkbox: true,
				ip: "127.0.0.1",
			},
		});
	}

	await tx.childTherapistAssignment.create({
		data: {
			childId: child.id,
			therapistId: therapist.id,
		},
	});

	return { child };
});

await prisma.initialAssessment.create({
	data: {
		childId: child.id,
		therapistId: therapist.id,
		versionNumber: 1,
		sectionA: {
			patientName: child.fullName,
			dob: "2018-01-01",
			age: { years: 7, months: 0 },
			gender: "Prefer not to say",
			assessmentDate: new Date().toISOString().slice(0, 10),
			referringTherapist: therapistName,
			caregiverName: "Game Tryout Guardian",
			caregiverRelation: "Parent",
			caregiverContact: "9999999999",
			caregiverEmail: `tryout-guardian-${runId}@example.com`,
			chiefComplaint: "Device tryout — synthetic data",
		},
		sectionB: {
			primaryDiagnoses: [],
			prenatalHistory: "N/A",
			birthHistory: "N/A",
			neonatalHistory: "N/A",
			medicalHistory: "N/A",
			currentMedications: "None",
			allergies: "None",
		},
		sectionC: {
			milestones: [
				{
					milestoneId: "tryout",
					delayed: false,
					notes: "Synthetic milestone for device tryout",
				},
			],
		},
		sectionD: {
			sensoryProfile: sensorySystems.map((system) => ({
				systemId: system.id,
				rating: 3,
				notes: "",
			})),
			behaviouralObservations: ["Synthetic observation for device tryout"],
		},
		sectionE: {
			functionalConcerns: [],
			observations: ["Synthetic observation for device tryout"],
		},
		sectionH: {
			therapistName,
			signedAt: new Date().toISOString(),
			guardianName: "Game Tryout Guardian",
			consentObtained: true,
		},
	},
});

const plan = await prisma.treatmentPlan.create({
	data: {
		childId: child.id,
		clinicId,
		createdById: therapist.id,
		name: "Game Tryout Plan",
		programLengthWeeks: 12,
		status: "ACTIVE",
		isActive: true,
		versionNumber: 1,
	},
});

const games = await prisma.game.findMany({
	include: {
		versions: {
			where: { isLatest: true },
			take: 1,
		},
	},
});

const SESSIONS_PER_GAME = 3;
let sessionsCreated = 0;

for (const game of games) {
	if (!game.versions[0]) {
		console.warn(`Skipping "${game.name}" — no latest GameVersion.`);
	}
}

const usableGames = games.filter((game) => game.versions[0]);
const gamesSkipped = games.length - usableGames.length;

// All sessions are scheduled today, spread evenly across a same-day window
// (07:00-23:00) so they show up on the therapist's "Today's Sessions"
// screen regardless of how many games/sessions are seeded.
const WINDOW_START_HOUR = 7;
const WINDOW_MINUTES = 16 * 60;
const totalSessions = usableGames.length * SESSIONS_PER_GAME;

const baseTime = new Date();
baseTime.setHours(WINDOW_START_HOUR, 0, 0, 0);

let slotIndex = 0;
for (const game of usableGames) {
	const gameVersion = game.versions[0];
	if (!gameVersion) continue;

	for (let i = 0; i < SESSIONS_PER_GAME; i++) {
		const offsetMinutes = Math.floor(
			(slotIndex * WINDOW_MINUTES) / totalSessions,
		);
		const scheduledDate = new Date(
			baseTime.getTime() + offsetMinutes * 60 * 1000,
		);
		slotIndex++;

		const session = await prisma.therapySession.create({
			data: {
				planId: plan.id,
				childId: child.id,
				assignedTherapistId: therapist.id,
				roomId: room.id,
				scheduledDate,
				durationMinutes: 60,
				status: "PENDING",
			},
		});

		await prisma.sessionGameAssignment.create({
			data: {
				sessionId: session.id,
				gameVersionId: gameVersion.id,
				order: 0,
			},
		});

		sessionsCreated++;
	}
}

console.log(`Created child ${child.id} ("${child.fullName}")`);
console.log(`Created treatment plan ${plan.id}`);
console.log(
	`Created ${sessionsCreated} sessions across ${usableGames.length} games` +
		(gamesSkipped > 0
			? ` (${gamesSkipped} games skipped — no latest version)`
			: ""),
);

await prisma.$disconnect();
console.log("Game tryout seed complete.");
