export type Phase = {
	phase: string;
	weeks: number;
	label: string;
};

export type GoalDecision = {
	goalId: string;
	action: "CARRY_OVER" | "CLOSE" | "MODIFY";
	newDescription?: string;
	newHorizon?: "SHORT_TERM" | "LONG_TERM";
	newTargetAttainmentPct?: number;
};

export type GameAssignment = {
	id: string;
	gameVersion: { game: { name: string }; versionNumber: string };
	durationSeconds: number | null;
	repetitions: number | null;
	frequencyPerWeek: number | null;
	appliesToPhase: string | null;
};

export type Goal = {
	id: string;
	description: string;
	horizon: "SHORT_TERM" | "LONG_TERM";
	targetAttainmentPct: number;
	currentAttainmentPct: number;
	status: "MET" | "IN_PROGRESS" | "NOT_MET" | "DISCONTINUED";
};
