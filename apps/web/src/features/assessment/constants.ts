export const SECTION_TABS = [
	{ value: "a", label: "Patient & Referral", field: "sectionA" },
	{ value: "b", label: "Medical History", field: "sectionB" },
	{ value: "c", label: "Milestones", field: "sectionC" },
	{ value: "d", label: "Sensory Profile", field: "sectionD" },
	{ value: "e", label: "Functional Concerns", field: "sectionE" },
	{ value: "f", label: "Assessment Tools", field: "sectionF" },
	{ value: "g", label: "Goals & Intervention", field: "sectionG" },
	{ value: "h", label: "Signatures & Consent", field: "sectionH" },
] as const;

export type SectionTabValue = (typeof SECTION_TABS)[number]["value"];

export const INTERVENTION_SETTINGS = [
	{ value: "ot_clinic", label: "OT Clinic" },
	{ value: "home", label: "Home" },
	{ value: "school", label: "School" },
	{ value: "early_intervention", label: "Early Intervention Programme" },
	{ value: "pediatric_rehab", label: "Pediatric Rehabilitation Clinic" },
	{ value: "hybrid", label: "Hybrid (combination)" },
];
