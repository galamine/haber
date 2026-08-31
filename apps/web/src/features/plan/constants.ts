export const PRESET_ICONS: Record<string, string> = {
	preset_asd_sensory: "Brain",
	preset_cp_spastic_diplegia_gmfcs2: "Accessibility",
	preset_adhd_sensory_seeking: "Zap",
	preset_down_syndrome_gdd: "Heart",
	preset_dcd_dyspraxia: "Activity",
};

export const NO_PRESET_ID = "";

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
