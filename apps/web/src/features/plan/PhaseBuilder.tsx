import { Button } from "@haber-final/ui/components/button";
import { Input } from "@haber-final/ui/components/input";
import { Textarea } from "@haber-final/ui/components/textarea";
import { type UseFormReturn, useFieldArray } from "react-hook-form";

import type { PlanFormValues } from "./schema";

type PhaseBuilderProps = {
	form: UseFormReturn<PlanFormValues>;
};

export function PhaseBuilder({ form }: PhaseBuilderProps) {
	const { fields, remove, insert } = useFieldArray({
		control: form.control,
		name: "phases",
	});
	const { register } = form;

	return (
		<ul className="space-y-3">
			{fields.map((field, idx) => (
				<li
					key={field.id}
					className="group relative rounded-lg border border-brown-200 bg-surface-container p-4"
					draggable
					onDragStart={() => {}}
					onDragOver={() => {}}
					onDrop={() => {}}
				>
					<div className="absolute top-0 bottom-0 left-0 w-1 rounded-l-lg bg-brown-500" />
					<div className="mb-2 flex items-start justify-between">
						<div className="flex items-center gap-2">
							<span className="material-symbols-outlined cursor-grab text-lg text-on-surface-variant active:cursor-grabbing">
								drag_indicator
							</span>
							<Input
								{...register(`phases.${idx}.label`)}
								className="w-48 border-transparent border-b bg-transparent px-0 py-0 font-medium hover:border-brown-300 focus:border-brown-600 focus:ring-0"
							/>
						</div>
						<div className="flex items-center gap-2">
							<span className="rounded-md border border-outline-variant bg-surface px-2 py-1 text-on-surface-variant text-xs">
								Weeks {form.watch(`phases.${idx}.weeks`) ?? 0}
							</span>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => remove(idx)}
								className="text-on-surface-variant opacity-0 hover:text-danger group-hover:opacity-100"
							>
								<span className="material-symbols-outlined text-lg">
									delete
								</span>
							</Button>
						</div>
					</div>
					<div className="pl-8">
						<Textarea
							{...register(`phases.${idx}.phase`)}
							placeholder="Describe the goals and methods for this phase..."
							rows={2}
							className="resize-none"
						/>
					</div>
				</li>
			))}
			<Button
				type="button"
				variant="outline"
				className="w-full rounded-lg border-2 border-brown-300 border-dashed"
				onClick={() =>
					insert(fields.length, {
						phase: `phase_${Date.now()}`,
						weeks: 4,
						label: `Phase ${fields.length + 1}`,
					})
				}
			>
				<span className="material-symbols-outlined">add_circle</span>
				Add Phase
			</Button>
		</ul>
	);
}
