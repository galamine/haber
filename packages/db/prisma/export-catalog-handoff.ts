// Writes game-catalog-handoff.json at the repo root: the rename list for the
// game developer, built from the same overlay the seed uses. No database access.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
	CATALOG_OVERLAY,
	CLINICAL_DOMAINS,
} from "./game-registry/catalog-overlay";
import { GAME_REGISTRY as CATCH_POP_GAMES } from "./game-registry/catch-pop-games";
import { GAME_REGISTRY as SELECTION_GAMES } from "./game-registry/selection-games";
import { GAME_REGISTRY as TRAIL_DRAW_REVEAL_SENSORY_GAMES } from "./game-registry/trail-draw-reveal-sensory-games";

const registry: Record<string, { title: string; path: string }> = {
	...SELECTION_GAMES,
	...CATCH_POP_GAMES,
	...TRAIL_DRAW_REVEAL_SENSORY_GAMES,
};

const games = Object.entries(CATALOG_OVERLAY)
	.map(([key, overlay]) => {
		const entry = registry[key];
		if (!entry) throw new Error(`Overlay key not in game registry: ${key}`);
		return {
			reviewId: overlay.reviewId,
			key,
			path: entry.path,
			currentTitle: entry.title,
			newTitle: overlay.title,
			newDescription: overlay.description,
			primaryDomain: overlay.primaryDomain,
			secondaryDomains: overlay.secondaryDomains,
		};
	})
	.sort((a, b) => a.reviewId.localeCompare(b.reviewId));

const handoff = {
	generatedAt: new Date().toISOString().slice(0, 10),
	note: "Rename list for the HaberApp game catalog. `key` and `path` identify each game and must not change. Update only the title and description shown inside the game and in the game registry to `newTitle` and `newDescription`, so the game that opens matches what the app lists.",
	domains: CLINICAL_DOMAINS.map((d) => d.name),
	games,
};

const outPath = fileURLToPath(
	new URL("../../../game-catalog-handoff.json", import.meta.url),
);
writeFileSync(outPath, `${JSON.stringify(handoff, null, "\t")}\n`);
console.log(`Wrote ${games.length} games to ${outPath}`);
