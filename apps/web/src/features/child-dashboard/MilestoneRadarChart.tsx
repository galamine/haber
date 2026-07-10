import { Card } from "@haber-final/ui/components/card";
import {
	Legend,
	PolarAngleAxis,
	PolarGrid,
	PolarRadiusAxis,
	Radar,
	RadarChart,
	ResponsiveContainer,
	Tooltip,
} from "recharts";

type MilestoneEntry = {
	versionNumber: number;
	recordedAt: Date;
	milestones: Array<{
		milestoneId: string;
		attained: boolean;
	}>;
};

type MilestoneRadarChartProps = {
	data: MilestoneEntry[];
};

const CHART_COLORS = [
	"var(--chart-1)",
	"var(--chart-2)",
	"var(--chart-3)",
	"var(--chart-4)",
	"var(--chart-5)",
	"var(--chart-6)",
	"var(--chart-7)",
];

export function MilestoneRadarChart({ data }: MilestoneRadarChartProps) {
	if (!data || data.length === 0) {
		return (
			<Card className="p-5">
				<h3 className="mb-4 font-medium text-on-surface">Milestone Progress</h3>
				<div className="flex h-64 items-center justify-center rounded-xl border border-surface-container-highest bg-surface-container-lowest">
					<p className="text-on-surface-variant text-sm">
						No milestone data to display.
					</p>
				</div>
			</Card>
		);
	}

	const allMilestoneIds = Array.from(
		new Set(data.flatMap((d) => d.milestones.map((m) => m.milestoneId))),
	);

	const chartData = allMilestoneIds.map((milestoneId) => {
		const entry: Record<string, unknown> = { milestone: milestoneId };
		data.forEach((version) => {
			const milestone = version.milestones.find(
				(m) => m.milestoneId === milestoneId,
			);
			entry[`v${version.versionNumber}`] = milestone?.attained ? 1 : 0;
		});
		return entry;
	});

	const versions = data.map((d) => `v${d.versionNumber}`);

	return (
		<Card className="p-5">
			<h3 className="mb-4 font-medium text-on-surface">Milestone Progress</h3>
			<div className="h-80 w-full">
				<ResponsiveContainer width="100%" height="100%">
					<RadarChart data={chartData}>
						<PolarGrid stroke="var(--color-border-primary)" />
						<PolarAngleAxis
							dataKey="milestone"
							tick={{ fontSize: 11, fill: "currentColor" }}
							className="text-on-surface-variant"
						/>
						<PolarRadiusAxis
							angle={90}
							domain={[0, 1]}
							tick={{ fontSize: 10, fill: "currentColor" }}
							className="text-on-surface-variant"
							tickCount={2}
						/>
						{versions.map((version, index) => (
							<Radar
								key={version}
								name={version}
								dataKey={version}
								stroke={CHART_COLORS[index % CHART_COLORS.length]}
								fill={CHART_COLORS[index % CHART_COLORS.length]}
								fillOpacity={0.2}
								strokeWidth={2}
							/>
						))}
						<Tooltip
							contentStyle={{
								backgroundColor: "var(--color-bg-primary)",
								border: "1px solid var(--color-border-primary)",
								borderRadius: "var(--radius)",
								fontSize: "12px",
							}}
						/>
						<Legend wrapperStyle={{ fontSize: "12px" }} iconType="circle" />
					</RadarChart>
				</ResponsiveContainer>
			</div>
		</Card>
	);
}
