import { z } from "zod";

const MilestoneSchema = z.object({
	pct: z.number(),
	elapsedSec: z.number(),
});

const ArcadeRawMetrics = z.object({
	game: z.object({ gameName: z.string() }),
	stats: z
		.object({
			score: z.number().optional(),
			caught: z.number().optional(),
			popped: z.number().optional(),
			missed: z.number().optional(),
			accuracyPct: z.number().optional(),
			bestStreak: z.number().optional(),
			timePlayedSec: z.number().optional(),
		})
		.optional(),
});

const DrawRawMetrics = z.object({
	gameName: z.string(),
	timeTakenSec: z.number().optional(),
	stampCount: z.number().optional(),
	image: z.string().optional(),
	number: z.string().optional(),
	milestones: z.array(MilestoneSchema).optional(),
	quiz: z
		.object({
			attempts: z.number().optional(),
			answered: z.boolean().optional(),
			correct: z.boolean().optional(),
		})
		.optional(),
});

const SelectionRoundSchema = z.object({
	index: z.number(),
	promptItem: z.string().optional(),
	result: z.string().optional(),
	decisionTimeMs: z.number().optional(),
});

const SelectionRawMetrics = z.object({
	session: z.object({ gameName: z.string() }),
	rounds: z.array(SelectionRoundSchema).optional(),
	aggregate: z
		.object({
			totalRounds: z.number().optional(),
			correct: z.number().optional(),
			wrong: z.number().optional(),
			timeouts: z.number().optional(),
			accuracy: z.number().optional(),
			meanDecisionTimeMs: z.number().optional(),
			minDecisionTimeMs: z.number().optional(),
			maxDecisionTimeMs: z.number().optional(),
			pauseCount: z.number().optional(),
		})
		.optional(),
});

export type ArcadeResultSummary = {
	family: "ARCADE";
	gameName: string;
	inGameScore: number | null;
	hits: number | null;
	missed: number | null;
	accuracyPct: number | null;
	bestStreak: number | null;
	timePlayedSec: number | null;
};

export type DrawResultSummary = {
	family: "DRAW";
	gameName: string;
	timeTakenSec: number | null;
	stampCount: number | null;
	item: string | null;
	milestones: { pct: number; elapsedSec: number }[];
	quiz: { attempts: number | null; answered: boolean; correct: boolean } | null;
};

export type SelectionResultSummary = {
	family: "SELECTION";
	gameName: string;
	totalRounds: number | null;
	correct: number | null;
	wrong: number | null;
	timeouts: number | null;
	accuracy: number | null;
	meanDecisionTimeMs: number | null;
	minDecisionTimeMs: number | null;
	maxDecisionTimeMs: number | null;
	pauseCount: number | null;
	rounds: {
		index: number;
		promptItem: string | null;
		result: string | null;
		decisionTimeMs: number | null;
	}[];
};

export type UnknownResultSummary = { family: "UNKNOWN" };

export type GameResultSummary =
	| ArcadeResultSummary
	| DrawResultSummary
	| SelectionResultSummary
	| UnknownResultSummary;

function summarizeArcade(
	raw: z.infer<typeof ArcadeRawMetrics>,
): ArcadeResultSummary {
	const stats = raw.stats ?? {};
	return {
		family: "ARCADE",
		gameName: raw.game.gameName,
		inGameScore: stats.score ?? null,
		hits: stats.caught ?? stats.popped ?? null,
		missed: stats.missed ?? null,
		accuracyPct: stats.accuracyPct ?? null,
		bestStreak: stats.bestStreak ?? null,
		timePlayedSec: stats.timePlayedSec ?? null,
	};
}

function summarizeDraw(raw: z.infer<typeof DrawRawMetrics>): DrawResultSummary {
	return {
		family: "DRAW",
		gameName: raw.gameName,
		timeTakenSec: raw.timeTakenSec ?? null,
		stampCount: raw.stampCount ?? null,
		item: raw.image ?? raw.number ?? null,
		milestones: raw.milestones ?? [],
		quiz: raw.quiz
			? {
					attempts: raw.quiz.attempts ?? null,
					answered: raw.quiz.answered ?? false,
					correct: raw.quiz.correct ?? false,
				}
			: null,
	};
}

function summarizeSelection(
	raw: z.infer<typeof SelectionRawMetrics>,
): SelectionResultSummary {
	const aggregate = raw.aggregate ?? {};
	return {
		family: "SELECTION",
		gameName: raw.session.gameName,
		totalRounds: aggregate.totalRounds ?? null,
		correct: aggregate.correct ?? null,
		wrong: aggregate.wrong ?? null,
		timeouts: aggregate.timeouts ?? null,
		accuracy: aggregate.accuracy ?? null,
		meanDecisionTimeMs: aggregate.meanDecisionTimeMs ?? null,
		minDecisionTimeMs: aggregate.minDecisionTimeMs ?? null,
		maxDecisionTimeMs: aggregate.maxDecisionTimeMs ?? null,
		pauseCount: aggregate.pauseCount ?? null,
		rounds: (raw.rounds ?? []).map((r) => ({
			index: r.index,
			promptItem: r.promptItem ?? null,
			result: r.result ?? null,
			decisionTimeMs: r.decisionTimeMs ?? null,
		})),
	};
}

/**
 * Reads the game's own name out of rawMetrics (the shape differs per family:
 * top-level for DRAW, nested under `game`/`session` for ARCADE/SELECTION)
 * rather than trusting caller-supplied context, so the result can be matched
 * to the correct SessionGameAssignment even when a session has multiple games.
 */
export function summarizeGameResult(rawMetrics: unknown): GameResultSummary {
	const arcade = ArcadeRawMetrics.safeParse(rawMetrics);
	if (arcade.success) return summarizeArcade(arcade.data);

	const selection = SelectionRawMetrics.safeParse(rawMetrics);
	if (selection.success) return summarizeSelection(selection.data);

	const draw = DrawRawMetrics.safeParse(rawMetrics);
	if (draw.success) return summarizeDraw(draw.data);

	return { family: "UNKNOWN" };
}

/**
 * A session can only ever have one GameResult (schema limitation) even
 * though it may have multiple SessionGameAssignments. This attributes that
 * one result to whichever assignment's game name matches the parsed
 * summary — or, when there's no ambiguity (a single assignment), attaches
 * it there even if the payload shape wasn't recognized.
 */
export function matchResultToAssignments<
	A extends { gameVersion: { game: { key: string | null } } },
>(
	assignments: A[],
	result: { rawMetrics: unknown } | null,
): (A & { resultSummary: GameResultSummary | null })[] {
	const resultSummary = result ? summarizeGameResult(result.rawMetrics) : null;
	const resultGameName =
		resultSummary && resultSummary.family !== "UNKNOWN"
			? resultSummary.gameName
			: null;
	const onlyAssignment = assignments.length === 1 ? assignments[0] : null;

	return assignments.map((assignment) => {
		const isMatch = resultGameName
			? assignment.gameVersion.game.key === resultGameName
			: assignment === onlyAssignment;
		return {
			...assignment,
			resultSummary: isMatch ? resultSummary : null,
		};
	});
}
