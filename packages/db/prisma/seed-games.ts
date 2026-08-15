import "dotenv/config";
import { createPrismaClient } from "../src/index";
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

const SUBFOLDER_CATEGORY_LABELS: Record<string, string> = {
	selection_game: "Selection Games",
	"pop-games": "Pop Games",
	"catch-games": "Catch Games",
	"trail-games": "Trail Games",
	"draw-games": "Draw Games",
	"reveal-games": "Reveal Games",
	"reveal-guess-games": "Reveal-Guess Games",
	"sensory-games": "Sensory Games",
};

function categorySlugFromPath(path: string): string {
	const segment = path.split("/")[2];
	if (!segment || !(segment in SUBFOLDER_CATEGORY_LABELS)) {
		throw new Error(`Cannot derive game category from path: ${path}`);
	}
	return segment;
}

const registries: Record<string, RegistryEntry>[] = [
	SELECTION_GAMES,
	CATCH_POP_GAMES,
	TRAIL_DRAW_REVEAL_SENSORY_GAMES,
];

const categoryIds = new Map<string, string>();
let gamesSeeded = 0;

for (const registry of registries) {
	for (const entry of Object.values(registry)) {
		if (SCAFFOLDING_KEYS.has(entry.name)) continue;

		const slug = categorySlugFromPath(entry.path);
		let categoryId = categoryIds.get(slug);
		if (!categoryId) {
			categoryId = `gc_reg_${slug.replace(/-/g, "_")}`;
			const label = SUBFOLDER_CATEGORY_LABELS[slug] ?? slug;
			await prisma.gameCategory.upsert({
				where: { id: categoryId },
				update: { name: label },
				create: { id: categoryId, name: label, clinicId: null, parentId: null },
			});
			categoryIds.set(slug, categoryId);
		}

		const game = await prisma.game.upsert({
			where: { key: entry.name },
			update: {
				name: entry.title,
				description: entry.description,
				categoryId,
				isGlobal: true,
			},
			create: {
				key: entry.name,
				name: entry.title,
				description: entry.description,
				categoryId,
				isGlobal: true,
			},
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
	`Seeded ${gamesSeeded} games across ${categoryIds.size} categories`,
);

await prisma.$disconnect();
console.log("Game registry seed complete.");
