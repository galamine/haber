import {
	Accessibility,
	Brain,
	FileSignature,
	FileText,
	type LucideIcon,
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
	{
		value: "h",
		label: "Signatures & Consent",
		field: "sectionH",
		icon: FileSignature,
	},
];

export type SectionTabValue = (typeof SECTION_TABS)[number]["value"];
