import { Checkbox } from "@haber-final/ui/components/checkbox";
import { Input } from "@haber-final/ui/components/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@haber-final/ui/components/table";
import { Controller, useFieldArray } from "react-hook-form";

import { SectionCard } from "../SectionCard";
import type { AssessmentSectionProps } from "../types";

type SectionCProps = AssessmentSectionProps & {
	milestoneById: Record<string, string>;
};

export function SectionC({ register, control, milestoneById }: SectionCProps) {
	const { fields } = useFieldArray({
		control,
		name: "sectionC.milestones",
	});

	return (
		<SectionCard title="Section C — Developmental Milestones">
			<div className="overflow-x-auto md:col-span-2">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Milestone</TableHead>
							<TableHead className="w-32">Achieved (months)</TableHead>
							<TableHead className="w-20">Delayed</TableHead>
							<TableHead>Notes</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{fields.map((field, idx) => (
							<TableRow key={field.id}>
								<TableCell className="font-medium text-on-surface">
									{milestoneById[field.milestoneId] ?? field.milestoneId}
								</TableCell>
								<TableCell>
									<Input
										type="number"
										{...register(
											`sectionC.milestones.${idx}.achievedAtAgeMonths`,
											{ setValueAs: (v) => (v === "" ? undefined : Number(v)) },
										)}
									/>
								</TableCell>
								<TableCell>
									<Controller
										control={control}
										name={`sectionC.milestones.${idx}.delayed`}
										render={({ field: checkboxField }) => (
											<Checkbox
												checked={checkboxField.value}
												onCheckedChange={(checked) =>
													checkboxField.onChange(checked === true)
												}
											/>
										)}
									/>
								</TableCell>
								<TableCell>
									<Input {...register(`sectionC.milestones.${idx}.notes`)} />
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</SectionCard>
	);
}
