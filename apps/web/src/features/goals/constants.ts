export const GOAL_STATUS_COLORS: Record<string, string> = {
	MET: "bg-[#dcfce7] text-[#15803d]",
	IN_PROGRESS: "bg-[#e0e7ff] text-[#4338ca]",
	NOT_MET: "bg-red-100 text-red-700",
	DISCONTINUED: "bg-surface-container text-on-surface-variant",
};

export const GOAL_STATUS_LABELS: Record<string, string> = {
	MET: "Met",
	IN_PROGRESS: "In Progress",
	NOT_MET: "Not Met",
	DISCONTINUED: "Discontinued",
};

export const GOAL_HORIZON_COLORS: Record<string, string> = {
	SHORT_TERM: "bg-[#fef9c3] text-[#854d0e]",
	LONG_TERM: "bg-[#dbeafe] text-[#1e40af]",
};
