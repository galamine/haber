export const PRESET_CARDS = [
	{
		preset_id: "preset_asd_sensory",
		case_label: "ASD Protocol",
		icon: "Brain",
		description:
			"Autism Spectrum Disorder baseline intervention focusing on communication.",
	},
	{
		preset_id: "preset_cp_spastic_diplegia_gmfcs2",
		case_label: "CP Mobility",
		icon: "Accessibility",
		description:
			"Cerebral Palsy focused physical therapy and motor skill enhancement.",
	},
	{
		preset_id: "preset_adhd_sustained_attention",
		case_label: "ADHD Focus",
		icon: "Zap",
		description:
			"Attention and executive function building exercises and routines.",
	},
	{
		preset_id: "preset_down_syndrome",
		case_label: "Down Syndrome",
		icon: "Heart",
		description:
			"Comprehensive developmental support and speech therapy framework.",
	},
	{
		preset_id: "preset_dcd_motor_planning",
		case_label: "DCD Framework",
		icon: "Activity",
		description:
			"Developmental Coordination Disorder motor planning and execution.",
	},
] as const;

export const PLAN_STATUS_COLORS: Record<string, string> = {
	DRAFT: "bg-surface-container text-on-surface-variant border-outline-variant",
	ACTIVE: "bg-[#dcfce7] text-[#15803d] border-[#bbf7d0]",
	PAUSED: "bg-[#fef3c7] text-[#b45309] border-[#fde68a]",
	COMPLETED: "bg-[#e0e7ff] text-[#4338ca] border-[#c7d2fe]",
	CLOSED: "bg-surface-container text-on-surface-variant border-outline-variant",
};

export const PLAN_STATUS_LABELS: Record<string, string> = {
	DRAFT: "Draft",
	ACTIVE: "Active",
	PAUSED: "Paused",
	COMPLETED: "Completed",
	CLOSED: "Closed",
};

export type PresetCard = (typeof PRESET_CARDS)[number];
