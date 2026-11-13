import "dotenv/config";
import { createPrismaClient } from "../src/index";
import {
	CATALOG_OVERLAY,
	CLINICAL_DOMAINS,
} from "./game-registry/catalog-overlay";
import { GAME_REGISTRY as CATCH_POP_GAMES } from "./game-registry/catch-pop-games";
import { GAME_REGISTRY as SELECTION_GAMES } from "./game-registry/selection-games";
import { GAME_REGISTRY as TRAIL_DRAW_REVEAL_SENSORY_GAMES } from "./game-registry/trail-draw-reveal-sensory-games";

interface RegistryEntry {
	name: string;
	version: string;
	title: string;
	description: string;
	entryScenes: string[];
	supportedLevels: number[];
	totalTimeSec: number;
	path: string;
}

const prisma = createPrismaClient();

// Dev/test scaffolding shipped by the game developer alongside the real
// catalog — not real therapy games, so they're never seeded.
const SCAFFOLDING_KEYS = new Set([
	"calibration",
	"template",
	"template-25D",
	"ios-test",
	"celebration-test",
	"template-trail",
	"template-reveal",
]);

const registries: Record<string, RegistryEntry>[] = [
	SELECTION_GAMES,
	CATCH_POP_GAMES,
	TRAIL_DRAW_REVEAL_SENSORY_GAMES,
];

const domainIds = new Map<string, string>();
for (const domain of CLINICAL_DOMAINS) {
	await prisma.gameCategory.upsert({
		where: { id: domain.id },
		update: { name: domain.name },
		create: {
			id: domain.id,
			name: domain.name,
			clinicId: null,
			parentId: null,
		},
	});
	domainIds.set(domain.name, domain.id);
}

let gamesSeeded = 0;

for (const registry of registries) {
	for (const entry of Object.values(registry)) {
		if (SCAFFOLDING_KEYS.has(entry.name)) continue;

		const overlay = CATALOG_OVERLAY[entry.name];
		if (!overlay) {
			throw new Error(`No catalog overlay entry for game: ${entry.name}`);
		}
		const categoryId = domainIds.get(overlay.primaryDomain);
		if (!categoryId) {
			throw new Error(`Unknown clinical domain: ${overlay.primaryDomain}`);
		}

		const gameData = {
			name: overlay.title,
			description: overlay.description,
			categoryId,
			secondaryDomains: overlay.secondaryDomains,
			isGlobal: true,
			// Only set when the overlay has one, so a re-seed never wipes a
			// path entered in the platform game form.
			...(overlay.previewPath ? { previewPath: overlay.previewPath } : {}),
		};
		const game = await prisma.game.upsert({
			where: { key: entry.name },
			update: gameData,
			create: { key: entry.name, ...gameData },
		});

		const existingVersion = await prisma.gameVersion.findFirst({
			where: { gameId: game.id, versionNumber: entry.version },
		});

		const versionData = {
			path: entry.path,
			entryScenes: entry.entryScenes,
			supportedLevels: entry.supportedLevels,
			totalTimeSec: entry.totalTimeSec,
		};

		if (existingVersion) {
			await prisma.gameVersion.update({
				where: { id: existingVersion.id },
				data: { ...versionData, isLatest: true },
			});
		} else {
			await prisma.gameVersion.updateMany({
				where: { gameId: game.id, isLatest: true },
				data: { isLatest: false },
			});
			await prisma.gameVersion.create({
				data: {
					gameId: game.id,
					versionNumber: entry.version,
					isLatest: true,
					rubricVersion: "1",
					scoringSchema: {},
					...versionData,
				},
			});
		}

		gamesSeeded++;
	}
}

console.log(
	`Seeded ${gamesSeeded} games across ${CLINICAL_DOMAINS.length} clinical domains`,
);

await prisma.$disconnect();
console.log("Game registry seed complete.");
