import {
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

import type { GoalProgressEntry } from "./types";

type GoalChartProps = {
	entries: GoalProgressEntry[];
};

function formatDate(date: Date) {
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
	}).format(new Date(date));
}

export function GoalChart({ entries }: GoalChartProps) {
	const data = entries.map((entry) => ({
		date: formatDate(entry.recordedAt),
		attainment: entry.attainmentPct,
		fullDate: entry.recordedAt,
	}));

	if (entries.length === 0) {
		return (
			<div className="flex h-48 items-center justify-center rounded-xl border border-surface-container-highest bg-surface-container-lowest">
				<p className="text-on-surface-variant text-sm">No data to display.</p>
			</div>
		);
	}

	return (
		<div className="h-64 w-full rounded-xl border border-surface-container-highest bg-surface-container-lowest p-4">
			<ResponsiveContainer width="100%" height="100%">
				<LineChart data={data}>
					<XAxis
						dataKey="date"
						tick={{ fontSize: 11, fill: "currentColor" }}
						stroke="currentColor"
						className="text-on-surface-variant"
					/>
					<YAxis
						domain={[0, 100]}
						tick={{ fontSize: 11, fill: "currentColor" }}
						stroke="currentColor"
						className="text-on-surface-variant"
						tickFormatter={(value) => `${value}%`}
					/>
					<Tooltip
						formatter={(value: number) => [`${value}%`, "Attainment"]}
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
					<Line
						type="monotone"
						dataKey="attainment"
						stroke="#f59e0b"
						strokeWidth={2}
						dot={{ fill: "#f59e0b", r: 4 }}
						activeDot={{ r: 6 }}
					/>
				</LineChart>
			</ResponsiveContainer>
		</div>
	);
}
