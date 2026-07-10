import { Card } from "@haber-final/ui/components/card";
import { cn } from "@haber-final/ui/lib/utils";
import { useState } from "react";
import {
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

type SensoryDataPoint = {
	recordedAt: Date;
	rating: number;
	source: "initial" | "followUp";
};

type SensorySystem = {
	systemId: string;
	dataPoints: SensoryDataPoint[];
};

type SensoryTrendChartProps = {
	data: SensorySystem[];
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

function formatDate(date: Date) {
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
	}).format(new Date(date));
}

export function SensoryTrendChart({ data }: SensoryTrendChartProps) {
	const [visible, setVisible] = useState<Record<string, boolean>>(() =>
		Object.fromEntries(data.map((d) => [d.systemId, true])),
	);

	if (!data || data.length === 0) {
		return (
			<Card className="p-5">
				<h3 className="mb-4 font-medium text-on-surface">
					Sensory System Trends
				</h3>
				<div className="flex h-64 items-center justify-center rounded-xl border border-surface-container-highest bg-surface-container-lowest">
					<p className="text-on-surface-variant text-sm">
						No sensory data to display.
					</p>
				</div>
			</Card>
		);
	}

	const allDataPoints = data.flatMap((d) => d.dataPoints);
	const sortedDates = Array.from(
		new Set(allDataPoints.map((dp) => new Date(dp.recordedAt).getTime())),
	)
		.sort((a, b) => a - b)
		.map((ts) => new Date(ts));

	const chartData = sortedDates.map((date) => {
		const entry: Record<string, unknown> = {
			date: formatDate(date),
			fullDate: date,
		};
		data.forEach((system) => {
			const point = system.dataPoints.find(
				(dp) => new Date(dp.recordedAt).getTime() === date.getTime(),
			);
			entry[system.systemId] = point?.rating ?? null;
		});
		return entry;
	});

	const toggleSystem = (systemId: string) => {
		setVisible((prev) => ({ ...prev, [systemId]: !prev[systemId] }));
	};

	return (
		<Card className="p-5">
			<h3 className="mb-4 font-medium text-on-surface">
				Sensory System Trends
			</h3>
			<div className="mb-3 flex flex-wrap gap-2">
				{data.map((system, index) => (
					<button
						key={system.systemId}
						type="button"
						onClick={() => toggleSystem(system.systemId)}
						className={cn(
							"flex items-center gap-1.5 rounded-full px-3 py-1 font-medium text-xs transition-opacity",
							visible[system.systemId] ? "opacity-100" : "opacity-40",
						)}
						style={{
							backgroundColor: `${CHART_COLORS[index % CHART_COLORS.length]}20`,
							color: CHART_COLORS[index % CHART_COLORS.length],
						}}
					>
						<span
							className="h-2 w-2 rounded-full"
							style={{
								backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
							}}
						/>
						{system.systemId}
					</button>
				))}
			</div>
			<div className="h-64 w-full">
				<ResponsiveContainer width="100%" height="100%">
					<LineChart data={chartData}>
						<XAxis
							dataKey="date"
							tick={{ fontSize: 11, fill: "currentColor" }}
							stroke="currentColor"
							className="text-on-surface-variant"
						/>
						<YAxis
							domain={[1, 5]}
							tick={{ fontSize: 11, fill: "currentColor" }}
							stroke="currentColor"
							className="text-on-surface-variant"
						/>
						<Tooltip
							contentStyle={{
								backgroundColor: "var(--color-bg-primary)",
								border: "1px solid var(--color-border-primary)",
								borderRadius: "var(--radius)",
								fontSize: "12px",
							}}
							labelFormatter={(label, payload) => {
								if (payload?.[0]?.payload?.fullDate) {
									return new Intl.DateTimeFormat("en-US", {
										month: "long",
										day: "numeric",
										year: "numeric",
									}).format(new Date(payload[0].payload.fullDate));
								}
								return label;
							}}
						/>
						{data.map((system, index) => (
							<Line
								key={system.systemId}
								type="monotone"
								dataKey={system.systemId}
								hide={!visible[system.systemId]}
								stroke={CHART_COLORS[index % CHART_COLORS.length]}
								strokeWidth={2}
								dot={{ fill: CHART_COLORS[index % CHART_COLORS.length], r: 4 }}
								activeDot={{ r: 6 }}
								connectNulls
							/>
						))}
					</LineChart>
				</ResponsiveContainer>
			</div>
		</Card>
	);
}
