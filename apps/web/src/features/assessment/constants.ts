import {
	Accessibility,
	Brain,
	Clipboard,
	FileSignature,
	FileText,
	type LucideIcon,
	Target,
	TrendingUp,
	User,
} from "lucide-react";

type SectionTabEntry = {
	value: string;
	label: string;
	field: string;
	icon: LucideIcon;
};

export const SECTION_TABS: readonly SectionTabEntry[] = [
	{ value: "a", label: "Patient & Referral", field: "sectionA", icon: User },
	{ value: "b", label: "Medical History", field: "sectionB", icon: FileText },
	{ value: "c", label: "Milestones", field: "sectionC", icon: TrendingUp },
	{
		value: "d",
		label: "Sensory Profile",
		field: "sectionD",
		icon: Brain,
	},
	{
		value: "e",
		label: "Functional Concerns",
		field: "sectionE",
		icon: Accessibility,
	},
	{ value: "f", label: "Assessment Tools", field: "sectionF", icon: Clipboard },
	{
		value: "g",
		label: "Goals & Intervention",
		field: "sectionG",
		icon: Target,
	},
	{
		value: "h",
		label: "Signatures & Consent",
		field: "sectionH",
		icon: FileSignature,
	},
];

export type SectionTabValue = (typeof SECTION_TABS)[number]["value"];

export const INTERVENTION_SETTINGS = [
	{ value: "ot_clinic", label: "OT Clinic" },
	{ value: "home", label: "Home" },
	{ value: "school", label: "School" },
	{ value: "early_intervention", label: "Early Intervention Programme" },
	{ value: "pediatric_rehab", label: "Pediatric Rehabilitation Clinic" },
	{ value: "hybrid", label: "Hybrid (combination)" },
];
