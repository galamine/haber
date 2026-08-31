import { Button } from "@haber-final/ui/components/button";
import { Input } from "@haber-final/ui/components/input";
import { Flag, Plus, X } from "lucide-react";
import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { PlanFormValues } from "./schema";

type GoalListProps = {
	label: string;
	values: string[];
	onChange: (values: string[]) => void;
};

function GoalList({ label, values, onChange }: GoalListProps) {
	const [draft, setDraft] = useState("");

	const addGoal = () => {
		const trimmed = draft.trim();
		if (!trimmed) return;
		onChange([...values, trimmed]);
		setDraft("");
	};

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
						<button
							type="button"
							onClick={() => onChange(values.filter((_, i) => i !== idx))}
							className="text-on-surface-variant hover:text-on-surface"
						>
							<X className="h-4 w-4" />
						</button>
					</div>
				))}
			</div>
			<div className="flex gap-2">
				<Input
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							addGoal();
						}
					}}
					placeholder={`Add a ${label.toLowerCase()} goal…`}
					className="text-sm"
				/>
				<Button type="button" variant="outline" size="sm" onClick={addGoal}>
					<Plus className="h-4 w-4" />
					Add
				</Button>
			</div>
		</div>
	);
}

type CustomGoalsSectionProps = {
	form: UseFormReturn<PlanFormValues>;
};

export function CustomGoalsSection({ form }: CustomGoalsSectionProps) {
	const shortTerm = form.watch("customGoals.short_term") ?? [];
	const longTerm = form.watch("customGoals.long_term") ?? [];

	return (
		<div className="mx-auto w-full max-w-3xl space-y-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
			<h3 className="flex items-center gap-2 font-medium text-on-background">
				<Flag className="h-5 w-5 text-brown-600" />
				Clinical Goals
			</h3>
			<GoalList
				label="Short-Term Goals"
				values={shortTerm}
				onChange={(v) => form.setValue("customGoals.short_term", v)}
			/>
			<GoalList
				label="Long-Term Goals"
				values={longTerm}
				onChange={(v) => form.setValue("customGoals.long_term", v)}
			/>
		</div>
	);
}
