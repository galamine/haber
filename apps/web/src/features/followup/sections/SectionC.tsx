import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@haber-final/ui/components/table";
import { Textarea } from "@haber-final/ui/components/textarea";
import { Controller, useFieldArray, useWatch } from "react-hook-form";

import { DeltaBadge } from "../delta-badge";
import { FieldWrapper } from "../FieldWrapper";
import { SectionCard } from "../SectionCard";
import type { FollowUpSectionProps } from "../types";

type SectionCProps = FollowUpSectionProps & {
	sensorySystemById: Record<string, string>;
	baselineMap: Record<string, number>;
};

export function SectionC({
	register,
	control,
	sensorySystemById,
	baselineMap,
}: SectionCProps) {
	const { fields } = useFieldArray({
		control,
		name: "sectionC.sensoryCheck",
	});

	const watchedCheck = useWatch({ control, name: "sectionC.sensoryCheck" });

	return (
		<SectionCard title="Section C — Sensory Progress Check">
			<div className="overflow-x-auto md:col-span-2">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>System</TableHead>
							<TableHead className="w-32">Baseline</TableHead>
							<TableHead className="w-48">Current Rating</TableHead>
							<TableHead className="w-32">Change</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{fields.map((field, idx) => {
							const baseline = baselineMap[field.systemId] ?? 0;
							const current =
								watchedCheck?.[idx]?.rating ?? baselineMap[field.systemId] ?? 0;
							return (
								<TableRow key={field.id}>
									<TableCell className="font-medium text-on-surface">
										{sensorySystemById[field.systemId] ?? field.systemId}
									</TableCell>
									<TableCell>
										<span className="text-on-surface-variant text-sm">
											{baseline} / 5
										</span>
									</TableCell>
									<TableCell>
										<Controller
											control={control}
											name={`sectionC.sensoryCheck.${idx}.rating`}
											render={({ field: sliderField }) => (
												<Slider
													min={1}
													max={5}
													step={1}
													value={[sliderField.value ?? baseline]}
													onValueChange={([v]) => sliderField.onChange(v)}
												/>
											)}
										/>
									</TableCell>
									<TableCell>
										<DeltaBadge delta={current - baseline} />
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</div>

			{fields.map((field, idx) => (
				<FieldWrapper
					key={field.id}
					label={`${sensorySystemById[field.systemId] ?? field.systemId} — Notes`}
					htmlFor={`sectionC.sensoryCheck.${idx}.notes`}
					className="md:col-span-2"
				>
					<Textarea
						id={`sectionC.sensoryCheck.${idx}.notes`}
						rows={2}
						placeholder="Observations for this system…"
						{...register(`sectionC.sensoryCheck.${idx}.notes`)}
					/>
				</FieldWrapper>
			))}
		</SectionCard>
	);
}
