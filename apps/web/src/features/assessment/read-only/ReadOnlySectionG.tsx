import type {
	GoalTemplateSchema,
	SectionGSchema,
} from "@haber-final/api/schemas/assessment";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@haber-final/ui/components/table";
import type { z } from "zod";
import { INTERVENTION_SETTINGS } from "../constants";
import { SectionCard } from "../SectionCard";
import { ReadOnlyField } from "./ReadOnlyField";

type SectionGData = z.infer<typeof SectionGSchema>;
type GoalData = z.infer<typeof GoalTemplateSchema>;

function GoalTable({ title, goals }: { title: string; goals: GoalData[] }) {
	return (
		<div className="md:col-span-2">
			<p className="mb-2 font-medium text-on-surface text-sm">{title}</p>
			{goals.length === 0 ? (
				<p className="text-on-surface-variant text-sm">No goals recorded.</p>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Description</TableHead>
							<TableHead className="w-40">Target Attainment %</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{goals.map((goal) => (
							<TableRow key={goal.goalId}>
								<TableCell>{goal.description}</TableCell>
								<TableCell>{goal.targetAttainmentPct}%</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</div>
	);
}

export function ReadOnlySectionG({
	data,
	equipmentById,
}: {
	data: SectionGData;
	equipmentById: Record<string, string>;
}) {
	const interventionSettingLabel =
		INTERVENTION_SETTINGS.find((s) => s.value === data.interventionSetting)
			?.label ?? data.interventionSetting;

	const equipmentLabels = data.equipment
		.map((id) => equipmentById[id] ?? id)
		.join(", ");

	return (
		<SectionCard title="Section G — Initial Goals & Intervention Plan">
			<GoalTable
				title="Short-Term Goals (4–6 weeks)"
				goals={data.shortTermGoals}
			/>
			<GoalTable
				title="Long-Term Goals (3–6 months)"
				goals={data.longTermGoals}
			/>

			<ReadOnlyField
				label="Recommended Frequency (sessions/week)"
				value={data.recommendedFrequency}
			/>
			<ReadOnlyField
				label="Session Duration (minutes)"
				value={data.sessionDurationMinutes}
			/>
			<ReadOnlyField
				label="Intervention Setting"
				value={interventionSettingLabel}
			/>
			<ReadOnlyField
				label="Review Period (weeks)"
				value={data.reviewPeriodWeeks}
			/>
			<ReadOnlyField
				label="Home Program Recommendations"
				value={data.homeProgramRecommendations}
				className="md:col-span-2"
			/>
			<ReadOnlyField
				label="Equipment / Sensory Diet Recommended"
				value={equipmentLabels}
				className="md:col-span-2"
			/>
			<ReadOnlyField
				label="Referrals to Other Specialists"
				value={data.referrals}
				className="md:col-span-2"
			/>
		</SectionCard>
	);
}
