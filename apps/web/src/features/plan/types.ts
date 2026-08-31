export type GoalDecision = {
	goalId: string;
	action: "CARRY_OVER" | "CLOSE" | "MODIFY";
	newDescription?: string;
	newHorizon?: "SHORT_TERM" | "LONG_TERM";
	newTargetAttainmentPct?: number;
};

export type Goal = {
	id: string;
	description: string;
	horizon: "SHORT_TERM" | "LONG_TERM";
	targetAttainmentPct: number;
	currentAttainmentPct: number;
	status: "MET" | "IN_PROGRESS" | "NOT_MET" | "DISCONTINUED";
};
