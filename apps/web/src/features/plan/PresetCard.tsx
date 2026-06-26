import { cn } from "@haber-final/ui/lib/utils";

type PresetCardProps = {
	preset: {
		preset_id: string;
		case_label: string;
		icon: string;
		description: string;
	};
	selected?: boolean;
	onSelect: (presetId: string) => void;
};

export function PresetCard({ preset, selected, onSelect }: PresetCardProps) {
	return (
		<button
			type="button"
			onClick={() => onSelect(preset.preset_id)}
			className={cn(
				"group flex flex-col items-start rounded-xl border p-4 text-left transition-all",
				selected
					? "border-brown-500 bg-surface-container-lowest shadow-md ring-1 ring-brown-500"
					: "border-outline-variant bg-surface-container-lowest hover:border-brown-400 hover:shadow-md",
			)}
		>
			<div
				className={cn(
					"mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container transition-colors",
					selected
						? "bg-brown-100 text-brown-600"
						: "text-brown-600 group-hover:bg-brown-100",
				)}
			>
				<span className="material-symbols-outlined">{preset.icon}</span>
			</div>
			<h4 className="font-medium text-on-surface text-sm">
				{preset.case_label}
			</h4>
			<p className="mt-1 line-clamp-2 text-on-surface-variant text-xs">
				{preset.description}
			</p>
		</button>
	);
}
