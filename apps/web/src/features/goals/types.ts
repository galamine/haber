export type Goal = {
	id: string;
	treatmentPlanId: string;
	description: string;
	horizon: "SHORT_TERM" | "LONG_TERM";
	targetAttainmentPct: number;
	currentAttainmentPct: number;
	status: "MET" | "IN_PROGRESS" | "NOT_MET" | "DISCONTINUED";
	supersededByGoalId: string | null;
	createdAt: Date;
};

export type GoalWithLatestNote = Goal & {
	latestNote?: string | null;
};

export type GoalProgressEntry = {
	id: string;
	goalId: string;
	followUpId: string;
	attainmentPct: number;
	status: "MET" | "IN_PROGRESS" | "NOT_MET" | "DISCONTINUED";
	evidenceNotes: string | null;
	recordedAt: Date;
};
