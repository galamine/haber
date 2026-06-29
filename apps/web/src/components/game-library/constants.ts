export const TARGET_ISSUES = [
	"Focus & Attention",
	"Fine Motor",
	"Gross Motor",
	"Sensory Processing",
	"Working Memory",
	"Visual-Spatial",
	"Language",
	"Social Skills",
	"Emotional Regulation",
	"Cognitive",
	"ADHD",
	"Anxiety",
	"Depression",
	"Focus",
] as const;

export type TargetIssue = (typeof TARGET_ISSUES)[number];

export const DIFFICULTY_LEVELS = ["1", "2", "3", "4", "5"] as const;
