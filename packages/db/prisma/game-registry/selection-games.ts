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
	assets: {
		images?: GameAsset[];
		audio?: GameAsset[];
	};
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
		path: "/therapy_games/selection_game/calibration.html",
		assets: {},
	},
	template: {
		name: "template",
		version: "1-0-0",
		title: "Template",
		description: "Base game template to build games",
		entryScenes: ["GameScene", "GameScene", "GameScene"],
		supportedLevels: [1, 2, 3],
		totalTimeSec: 200,
		path: "/therapy_games/selection_game/template.html",
		assets: {},
	},
	"template-25D": {
		name: "template-25D",
		version: "1-0-0",
		title: "Template 2.5D",
		description: "Base game template for 2.5D games",
		entryScenes: ["GameScene"],
		supportedLevels: [1],
		totalTimeSec: 200,
		path: "/therapy_games/selection_game/template-25D.html",
		assets: {},
	},
	"ios-test": {
		name: "ios-test",
		version: "1-0-0",
		title: "IOS Test Sandbox",
		description:
			"Test all Interactive Object System features, toggle effects, and tweak config in real-time",
		entryScenes: ["IOSTestScene"],
		supportedLevels: [1],
		totalTimeSec: 600,
		path: "/therapy_games/selection_game/ios-test.html",
		assets: {},
	},
	"celebration-test": {
		name: "celebration-test",
		version: "1-0-0",
		title: "Celebration Effects Test",
		description:
			"Test all celebration effects with a dynamic config panel — play, tweak parameters, and preview",
		entryScenes: ["CelebrationTestScene"],
		supportedLevels: [1],
		totalTimeSec: 600,
		path: "/therapy_games/selection_game/celebration-test.html",
		assets: {},
	},
	"color-reaction-step": {
		name: "color-reaction-step",
		version: "1-0-0",
		title: "Color Reaction Step",
		description:
			"A motor skills game where the player steps on the called color to sharpen reaction time and movement control. Across ten levels of increasing difficulty, the floor presents up to four colored panels with progressively faster prompts. [1-3 Color Reaction Step]",
		entryScenes: ["GameScene"],
		supportedLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
		totalTimeSec: 200,
		path: "/therapy_games/selection_game/color-reaction-step.html",
		assets: {},
	},
	"smart-object-recognition": {
		name: "smart-object-recognition",
		version: "1-0-0",
		title: "Smart Object Recognition",
		description:
			"A cognitive processing game where the player is shown a named everyday object and must step on it from a row of options. Ten levels of increasing difficulty cap at four objects per round, with progressively shorter prompts to stretch recognition and decision time. [2-1 Smart Object Recognition]",
		entryScenes: ["GameScene"],
		supportedLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
		totalTimeSec: 120,
		path: "/therapy_games/selection_game/smart-object-recognition.html",
		assets: {},
	},
	"odd-one-out-shape": {
		name: "odd-one-out-shape",
		version: "1-0-0",
		title: "Odd One Out - Shape",
		description:
			"A cognitive processing game where the player is shown a row of shapes and must spot the one that does not belong. Across ten levels of increasing difficulty, the round grows to four shapes and the time window shrinks, sharpening visual discrimination. [2-5 Odd One Out AI]",
		entryScenes: ["GameScene"],
		supportedLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
		totalTimeSec: 120,
		path: "/therapy_games/selection_game/odd-one-out-shape.html",
		assets: {},
	},
	"odd-one-out-color": {
		name: "odd-one-out-color",
		version: "1-0-0",
		title: "Odd One Out - Color",
		description:
			"A cognitive processing game where the player is shown a row of same-shape tiles in matching colors and must spot the one tinted differently. Across ten levels of increasing difficulty, the row grows to four tiles and the time window shrinks, sharpening color discrimination. [2-5 Odd One Out AI]",
		entryScenes: ["GameScene"],
		supportedLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
		totalTimeSec: 120,
		path: "/therapy_games/selection_game/odd-one-out-color.html",
		assets: {},
	},
	"odd-one-out-category": {
		name: "odd-one-out-category",
		version: "1-0-0",
		title: "Odd One Out - Category",
		description:
			"A cognitive processing game where the player is shown a row of items and must spot the one that does not share the same category. Across ten levels of increasing difficulty, the row grows from three to four items and the time window shrinks, sharpening categorical discrimination. [2-5 Odd One Out AI]",
		entryScenes: ["GameScene"],
		supportedLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
		totalTimeSec: 120,
		path: "/therapy_games/selection_game/odd-one-out-category.html",
		assets: {},
	},
	"shape-and-size-logic": {
		name: "shape-and-size-logic",
		version: "1-0-0",
		title: "Shape And Size Logic",
		description:
			"A cognitive processing game where the player is shown a row of same-shape tiles at varying sizes and must step on either the biggest or the smallest. Across ten levels of increasing difficulty, the row grows from two to four tiles and the time window shrinks, sharpening size comparison. [2-8 Shape & Size Logic]",
		entryScenes: ["GameScene"],
		supportedLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
		totalTimeSec: 120,
		path: "/therapy_games/selection_game/shape-and-size-logic.html",
		assets: {},
	},
	"ignore-distraction-game": {
		name: "ignore-distraction-game",
		version: "1-0-0",
		title: "Ignore Distraction Game",
		description:
			"An attention and focus game where four colored shapes are shown and the player must step on the one matching both a called color and shape. Distracting decorations fill the floor and grow denser across ten levels, sharpening selective attention and filtering. [3-2 Ignore Distraction Game]",
		entryScenes: ["GameScene"],
		supportedLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
		totalTimeSec: 120,
		path: "/therapy_games/selection_game/ignore-distraction-game.html",
		assets: {},
	},
	sentence_completion: {
		name: "sentence_completion",
		version: "1-0-0",
		title: "Sentence Completion",
		description:
			"A communication and language game where an incomplete sentence is shown on the floor with a gold-highlighted blank and the player must step on the word that completes it grammatically and meaningfully. Ten levels of increasing vocabulary difficulty pack up to four options per round with shorter time windows, building reading and sentence-comprehension skills. [6-5 Sentence Completion]",
		entryScenes: ["GameScene"],
		supportedLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
		totalTimeSec: 120,
		path: "/therapy_games/selection_game/sentence_completion.html",
		assets: {},
	},
	yes_or_no_response_game: {
		name: "yes_or_no_response_game",
		version: "1-0-0",
		title: "Yes Or No Response Game",
		description:
			"A communication and language game where simple yes/no questions are presented and the child responds by stepping on the always-green YES zone on the left or the always-red NO zone on the right. Ten levels ask progressively richer factual and reasoning questions while the round timer shortens, building early comprehension and decision-making. [6-10 Yes/No Response Game]",
		entryScenes: ["GameScene"],
		supportedLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
		totalTimeSec: 120,
		path: "/therapy_games/selection_game/yes_or_no_response_game.html",
		assets: {},
	},
	sound_direction_game: {
		name: "sound_direction_game",
		version: "1-0-0",
		title: "Sound Direction Game",
		description:
			"A sensory processing game where a sound plays from the left speaker, the right speaker, or both equally, and the child steps on the matching LEFT, BOTH, or RIGHT panel on the floor. Ten levels shorten both the round timer and the audio cue so the player must localize sound faster, training auditory directional attention. [7-2 Sound Direction Game]",
		entryScenes: ["GameScene"],
		supportedLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
		totalTimeSec: 120,
		path: "/therapy_games/selection_game/sound_direction_game.html",
		assets: {},
	},
	texture_identification: {
		name: "texture_identification",
		version: "1-0-0",
		title: "Texture Identification",
		description:
			"A sensory processing game where texture images are shown on the floor and the child steps on the one matching the called texture such as rough, smooth, bumpy, soft, hard, or silky. Ten levels of increasing difficulty present up to four texture tiles per round with shorter time windows, training tactile recognition and visual-texture categorization. [7-3Texture Identification]",
		entryScenes: ["GameScene"],
		supportedLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
		totalTimeSec: 120,
		path: "/therapy_games/selection_game/texture_identification.html",
		assets: {},
	},
	emotion_recognition_ai: {
		name: "emotion_recognition_ai",
		version: "1-0-0",
		title: "Emotion Recognition AI",
		description:
			"An emotional regulation game where photographs of faces expressing emotions are shown on the floor and the child steps on the one matching the called emotion such as happy, sad, angry, scared, or surprised. Ten levels of increasing difficulty present up to four emotion tiles per round with shorter time windows, training facial emotion recognition and affective vocabulary. [8-1 Emotion Recognition AI]",
		entryScenes: ["GameScene"],
		supportedLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
		totalTimeSec: 120,
		path: "/therapy_games/selection_game/emotion_recognition_ai.html",
		assets: {},
	},
};

export function getGameEntry(gameName: string): GameEntry | undefined {
	return GAME_REGISTRY[gameName];
}

export function getAllGameNames(): string[] {
	return Object.keys(GAME_REGISTRY);
}
