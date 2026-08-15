export interface GameAsset {
	key: string;
	url: string;
}

export interface GameEntry {
	name: string;
	version: string;
	title: string;
	description: string;
	entryScenes: string[];
	supportedLevels: number[];
	/**
	 * Default session budget in seconds. URL `?totalTime=N` overrides
	 * this if supplied. Each game scene can also override per-level via
	 * its own LEVELS map; the precedence chain is documented in AGENTS.md.
	 */
	totalTimeSec: number;
	path: string;
}

export const GAME_REGISTRY: Record<string, GameEntry> = {
	calibration: {
		name: "calibration",
		version: "1-0-0",
		title: "calibration",
		description: "calibration for the tracking",
		entryScenes: ["GameScene"],
		supportedLevels: [1],
		totalTimeSec: 60,
		path: "/activity_games/calibration.html",
	},
	"ball-pop": {
		name: "ball-pop",
		version: "1-0-0",
		title: "Ball Pop",
		description: "Pop the balls by stepping on them!",
		entryScenes: ["GameScene"],
		supportedLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
		totalTimeSec: 90,
		path: "/activity_games/pop-games/ball-pop.html",
	},
	"heart-balloon-pop": {
		name: "heart-balloon-pop",
		version: "1-0-0",
		title: "Heart Balloon Pop",
		description: "Pop the heart balloons by stepping on them!",
		entryScenes: ["GameScene"],
		supportedLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
		totalTimeSec: 90,
		path: "/activity_games/pop-games/heart-balloon-pop.html",
	},
	"candy-pop": {
		name: "candy-pop",
		version: "1-0-0",
		title: "Candy Pop",
		description: "Pop the candies by stepping on them!",
		entryScenes: ["GameScene"],
		supportedLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
		totalTimeSec: 90,
		path: "/activity_games/pop-games/candy-pop.html",
	},
	"bubble-pop": {
		name: "bubble-pop",
		version: "1-0-0",
		title: "Bubble Pop",
		description: "Pop the bubbles by stepping on them!",
		entryScenes: ["GameScene"],
		supportedLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
		totalTimeSec: 90,
		path: "/activity_games/pop-games/bubble-pop.html",
	},
	"apple-catch": {
		name: "apple-catch",
		version: "1-0-0",
		title: "Apple Catch",
		description: "Catch the falling apples with your basket!",
		entryScenes: ["GameScene"],
		supportedLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
		totalTimeSec: 90,
		path: "/activity_games/catch-games/apple-catch.html",
	},
	"balloon-pop": {
		name: "balloon-pop",
		version: "1-0-0",
		title: "Balloon Pop",
		description: "Pop the floating balloons by stepping on them!",
		entryScenes: ["GameScene"],
		supportedLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
		totalTimeSec: 90,
		path: "/activity_games/pop-games/balloon-pop.html",
	},
};

export function getGameEntry(gameName: string): GameEntry | undefined {
	return GAME_REGISTRY[gameName];
}

export function getAllGameNames(): string[] {
	return Object.keys(GAME_REGISTRY);
}
