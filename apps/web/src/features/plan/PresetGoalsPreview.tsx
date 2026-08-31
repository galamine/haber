import { Flag } from "lucide-react";

type GoalPreviewListProps = {
	label: string;
	values: string[];
};

function GoalPreviewList({ label, values }: GoalPreviewListProps) {
	return (
		<div className="space-y-2">
			<h4 className="font-medium text-on-surface text-sm">{label}</h4>
			<div className="space-y-2">
				{values.map((value, idx) => (
					<div
						key={`${idx}-${value}`}
						className="flex items-center gap-2 rounded-lg border bg-surface-container-lowest px-3 py-2"
					>
						<p className="flex-1 text-on-surface text-sm">{value}</p>
					</div>
				))}
			</div>
		</div>
	);
}

type PresetGoalsPreviewProps = {
	preset: {
		short_term_goals_template: string[];
		long_term_goals_template: string[];
	};
};

export function PresetGoalsPreview({ preset }: PresetGoalsPreviewProps) {
	return (
		<div className="mx-auto w-full max-w-3xl space-y-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
			<h3 className="flex items-center gap-2 font-medium text-on-background">
				<Flag className="h-5 w-5 text-brown-600" />
				Clinical Goals
			</h3>
			<p className="text-on-surface-variant text-xs">
				Goals from this preset — not editable here.
			</p>
			<GoalPreviewList
				label="Short-Term Goals"
				values={preset.short_term_goals_template}
			/>
			<GoalPreviewList
				label="Long-Term Goals"
				values={preset.long_term_goals_template}
			/>
		</div>
	);
}
