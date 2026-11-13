// Platform-owned catalog data, keyed by the game registry `name`.
// Source: HaberApp Game Naming and Review Instruction Manual (R01–R53).
// The registry files next to this one are shipped by the game developer and
// are not edited; the seed applies this overlay on top of them.

export const CLINICAL_DOMAINS = [
	{ id: "gc_dom_motor_skills", name: "Motor Skills" },
	{ id: "gc_dom_cognitive_processing", name: "Cognitive Processing" },
	{ id: "gc_dom_attention_focus", name: "Attention & Focus" },
	{ id: "gc_dom_memory_learning", name: "Memory & Learning" },
	{ id: "gc_dom_balance_coordination", name: "Balance & Coordination" },
	{ id: "gc_dom_communication_language", name: "Communication & Language" },
	{ id: "gc_dom_sensory_processing", name: "Sensory Processing" },
	{ id: "gc_dom_emotional_regulation", name: "Emotional Regulation" },
	{ id: "gc_dom_social_interaction", name: "Social Interaction" },
	{ id: "gc_dom_daily_living_skills", name: "Daily Living Skills" },
] as const;

export type ClinicalDomain = (typeof CLINICAL_DOMAINS)[number]["name"];

export interface CatalogOverlayEntry {
	reviewId: string;
	title: string;
	description: string;
	primaryDomain: ClinicalDomain;
	secondaryDomains: ClinicalDomain[];
	/** Preview clip (mp4/webm/gif) path on the game server, shown in the game picker. */
	previewPath?: string;
}

function trail(
	reviewId: string,
	title: string,
	effect: string,
): CatalogOverlayEntry {
	return {
		reviewId,
		title,
		description: `Move your feet to create the ${effect} trail effect across the floor. Explore how your movement changes the visual display.`,
		primaryDomain: "Sensory Processing",
		secondaryDomains: ["Motor Skills"],
	};
}

function traceWalk(
	reviewId: string,
	title: string,
	target: string,
): CatalogOverlayEntry {
	return {
		reviewId,
		title,
		description: `Move your feet over ${target} to fill it with colour. Practise directing your movement towards a visible target.`,
		primaryDomain: "Motor Skills",
		secondaryDomains: ["Balance & Coordination"],
	};
}

function sweep(
	reviewId: string,
	title: string,
	action: string,
): CatalogOverlayEntry {
	return {
		reviewId,
		title,
		description: `Move your feet to ${action}. Explore controlled movement and its visible effects.`,
		primaryDomain: "Motor Skills",
		secondaryDomains: ["Sensory Processing"],
	};
}

function pictureReveal(
	reviewId: string,
	title: string,
	subject: string,
): CatalogOverlayEntry {
	return {
		reviewId,
		title,
		description: `Move your feet to uncover a hidden picture of ${subject}. Practise directing movement to uncover more of the picture.`,
		primaryDomain: "Motor Skills",
		secondaryDomains: ["Sensory Processing"],
	};
}

function revealGuess(
	reviewId: string,
	title: string,
	subject: string,
): CatalogOverlayEntry {
	return {
		reviewId,
		title,
		description: `Move your feet to uncover a hidden picture of ${subject}. Choose its name from three options as the picture appears. Practise recognising pictures while controlling your movements.`,
		primaryDomain: "Cognitive Processing",
		secondaryDomains: ["Communication & Language", "Motor Skills"],
	};
}

function stepPop(
	reviewId: string,
	title: string,
	targets: string,
	secondaryDomains: ClinicalDomain[] = ["Balance & Coordination"],
): CatalogOverlayEntry {
	return {
		reviewId,
		title,
		description: `Step on ${targets} to pop them. Practise directed stepping and movement control.`,
		primaryDomain: "Motor Skills",
		secondaryDomains,
	};
}

export const CATALOG_OVERLAY: Record<string, CatalogOverlayEntry> = {
	"trace-walk-shapes": traceWalk("R01", "Shape Trace Walk", "a shape"),
	"trace-walk-alphabet": traceWalk("R02", "Letter Trace Walk", "a letter"),
	"trace-walk-number": traceWalk("R03", "Number Trace Walk", "a number"),
	"paint-floor": {
		reviewId: "R04",
		title: "Walk & Paint",
		description:
			"Move your feet to paint pictures and patterns. Choose colours and brushes for open-ended creative movement.",
		primaryDomain: "Motor Skills",
		secondaryDomains: ["Sensory Processing"],
	},

	"trail-confetti": trail("R05", "Confetti Trail", "confetti"),
	"trail-flower-garden": trail("R06", "Petal Trail", "petal"),
	"trail-ice-crystal": trail("R07", "Ice Crystal Trail", "ice crystal"),
	"trail-underwater-bubble": trail(
		"R08",
		"Underwater Bubble Trail",
		"underwater bubble",
	),
	"trail-firework": trail("R09", "Firework Spark Trail", "firework spark"),
	"trail-teddy-print": trail("R10", "Teddy Paw Trail", "teddy paw"),
	"trail-candy-drop": trail("R11", "Candy Drop Trail", "candy drop"),
	"trail-cloud-puff": trail("R12", "Cloud Puff Trail", "cloud puff"),
	"trail-rainbow-swirl": trail("R13", "Rainbow Star Trail", "rainbow star"),
	"trail-heart": trail("R14", "Floating Heart Trail", "floating heart"),
	"trail-rainbow-lines": trail("R15", "Rainbow Ribbon Trail", "rainbow ribbon"),
	"trail-firefly": trail("R16", "Firefly Glow Trail", "firefly glow"),
	"trail-glitter": trail("R17", "Diamond Glitter Trail", "diamond glitter"),
	"trail-bubble": trail("R18", "Soap Bubble Trail", "soap bubble"),
	"trail-galaxy": trail("R19", "Galaxy Swirl Trail", "galaxy swirl"),
	"trail-magic-sparkle": trail("R20", "Magic Star Trail", "magic star"),
	"trail-ember": trail("R21", "Ember Glow Trail", "ember glow"),
	"trail-snow": trail("R22", "Snowfall Trail", "snowfall"),
	"trail-paint": trail("R23", "Paint Splatter Trail", "paint splatter"),
	"trail-stardust": trail("R24", "Falling Stardust Trail", "falling stardust"),

	"water-walk": sweep(
		"R25",
		"Ripple Walk",
		"create ripples in the water display",
	),
	"scatter-leaf": sweep(
		"R26",
		"Autumn Leaf Sweep",
		"push aside the displayed leaves",
	),
	"scatter-shells": sweep(
		"R27",
		"Seashell Sweep",
		"push aside the displayed shells",
	),
	"scatter-fruit": sweep(
		"R28",
		"Fruit Sweep",
		"push aside the displayed fruit",
	),

	"guess-fruits": revealGuess("R29", "Reveal & Guess: Fruit", "fruit"),
	"guess-animals": revealGuess("R30", "Reveal & Guess: Animals", "animals"),

	"reveal-flowers": pictureReveal("R31", "Flower Picture Reveal", "flowers"),
	"reveal-birds": pictureReveal("R32", "Bird Picture Reveal", "birds"),
	"reveal-fruits": pictureReveal("R33", "Fruit Picture Reveal", "fruit"),
	"reveal-vehicles": pictureReveal("R34", "Vehicle Picture Reveal", "vehicles"),
	"reveal-animals": pictureReveal("R35", "Animal Picture Reveal", "animals"),

	"balloon-pop": stepPop("R36", "Step & Pop: Balloons", "floating balloons", [
		"Balance & Coordination",
		"Attention & Focus",
	]),
	"apple-catch": {
		reviewId: "R37",
		title: "Basket Apple Catch",
		description:
			"Move a basket to catch falling apples. Practise interception timing and coordination.",
		primaryDomain: "Balance & Coordination",
		secondaryDomains: ["Motor Skills", "Attention & Focus"],
	},
	"bubble-pop": stepPop("R38", "Step & Pop: Bubbles", "bubbles"),
	"candy-pop": stepPop("R39", "Step & Pop: Candy", "candy targets"),
	"heart-balloon-pop": stepPop(
		"R40",
		"Step & Pop: Heart Balloons",
		"heart-shaped balloons",
	),
	"ball-pop": stepPop("R41", "Step & Pop: Balls", "ball targets"),

	emotion_recognition_ai: {
		reviewId: "R42",
		title: "Emotion Match",
		description:
			"Listen to an emotion word and step on the matching face. Practise recognising facial expressions and understanding emotion words.",
		primaryDomain: "Emotional Regulation",
		secondaryDomains: ["Communication & Language", "Cognitive Processing"],
	},
	texture_identification: {
		reviewId: "R43",
		title: "Texture Picture Match",
		description:
			"Listen to a texture word and choose its matching picture. Practise visual texture categories and vocabulary.",
		primaryDomain: "Sensory Processing",
		secondaryDomains: ["Cognitive Processing", "Communication & Language"],
	},
	sound_direction_game: {
		reviewId: "R44",
		title: "Sound Direction Step",
		description:
			"Listen to where a sound comes from, then step on Left, Both, or Right. Practise matching sound direction to a response.",
		primaryDomain: "Sensory Processing",
		secondaryDomains: ["Attention & Focus"],
	},
	yes_or_no_response_game: {
		reviewId: "R45",
		title: "Yes or No Step",
		description:
			"Read or listen to a question and step on Yes or No. Practise understanding questions and choosing an answer.",
		primaryDomain: "Communication & Language",
		secondaryDomains: ["Cognitive Processing"],
	},
	sentence_completion: {
		reviewId: "R46",
		title: "Complete the Sentence",
		description:
			"Read the unfinished sentence and step on the word that completes it. Practise vocabulary and sentence comprehension.",
		primaryDomain: "Communication & Language",
		secondaryDomains: ["Cognitive Processing"],
	},
	"ignore-distraction-game": {
		reviewId: "R47",
		title: "Focus: Colour & Shape",
		description:
			"Find the shape that matches both the colour and shape prompt, while ignoring distracting decorations. Practise selective attention and accurate choices.",
		primaryDomain: "Attention & Focus",
		secondaryDomains: ["Cognitive Processing", "Motor Skills"],
	},
	"shape-and-size-logic": {
		reviewId: "R48",
		title: "Biggest or Smallest",
		description:
			"Step on the biggest or smallest shape, as instructed. Practise comparing sizes and following comparison words.",
		primaryDomain: "Cognitive Processing",
		secondaryDomains: ["Communication & Language"],
	},
	"odd-one-out-category": {
		reviewId: "R49",
		title: "Odd One Out: Categories",
		description:
			"Find the item that belongs to a different category. Practise grouping objects by shared features.",
		primaryDomain: "Cognitive Processing",
		secondaryDomains: ["Communication & Language"],
	},
	"odd-one-out-color": {
		reviewId: "R50",
		title: "Odd One Out: Colours",
		description:
			"Find the tile with a different colour. Practise noticing visual differences.",
		primaryDomain: "Cognitive Processing",
		secondaryDomains: [],
	},
	"odd-one-out-shape": {
		reviewId: "R51",
		title: "Odd One Out: Shapes",
		description:
			"Find the shape that differs from the others. Practise comparing and distinguishing shapes.",
		primaryDomain: "Cognitive Processing",
		secondaryDomains: [],
	},
	"smart-object-recognition": {
		reviewId: "R52",
		title: "Find the Named Object",
		description:
			"Find and step on the object named in the prompt. Practise recognising everyday objects and linking names to pictures.",
		primaryDomain: "Cognitive Processing",
		secondaryDomains: ["Communication & Language"],
	},
	"color-reaction-step": {
		reviewId: "R53",
		title: "Colour Cue Step",
		description:
			"Step on the colour named in the prompt. Practise responding to cues with controlled, directed steps.",
		primaryDomain: "Motor Skills",
		secondaryDomains: ["Attention & Focus", "Balance & Coordination"],
	},
};
