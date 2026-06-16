export const FOLLOWUP_TABS = [
	{ value: "a", label: "Session Info", field: "sectionA" },
	{ value: "b", label: "Goal Progress", field: "sectionB" },
	{ value: "c", label: "Sensory Progress", field: "sectionC" },
	{ value: "d", label: "Clinical Questions", field: "sectionD" },
	{ value: "e", label: "Plan Adjustments", field: "sectionE" },
	{ value: "f", label: "Signatures & Consent", field: "sectionF" },
] as const;
export type FollowUpTabValue = (typeof FOLLOWUP_TABS)[number]["value"];

export const COMPLIANCE_OPTIONS = [
	{ value: "excellent", label: "Excellent" },
	{ value: "good", label: "Good" },
	{ value: "partial", label: "Partial" },
	{ value: "minimal", label: "Minimal" },
	{ value: "not_started", label: "Not Started" },
] as const;

export const ENGAGEMENT_OPTIONS = [
	{ value: "excellent", label: "Excellent" },
	{ value: "good", label: "Good" },
	{ value: "fair", label: "Fair" },
	{ value: "poor", label: "Poor" },
] as const;

export const GOAL_STATUS_OPTIONS = [
	{ value: "MET", label: "Goal Met" },
	{ value: "IN_PROGRESS", label: "In Progress" },
	{ value: "NOT_MET", label: "Not Met" },
	{ value: "DISCONTINUED", label: "Discontinued" },
] as const;

export const GOAL_STATUS_DECISION_OPTIONS = [
	{ value: "continue_all", label: "Continue all current goals" },
	{ value: "modify_existing", label: "Modify existing goals" },
	{ value: "add_new", label: "Add new goals" },
	{ value: "discontinue", label: "Discontinue goals" },
	{ value: "refer_to_specialist", label: "Refer to specialist" },
] as const;

export const NEXT_ASSESSMENT_TYPE_OPTIONS = [
	{ value: "follow_up", label: "Follow-Up Assessment" },
	{ value: "discharge", label: "Discharge Assessment" },
	{ value: "annual", label: "Annual Review" },
] as const;
