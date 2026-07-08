import { Card } from "@haber-final/ui/components/card";
import { useMemo } from "react";
import {
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

type GameScoreEntry = {
	date: Date;
	gameId: string;
	gameName: string;
	score: number;
	rawMetrics: Record<string, unknown> | null;
};

type GameScoreTrendChartProps = {
	data: GameScoreEntry[];
};

function formatDate(date: Date) {
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
	}).format(new Date(date));
}

export function GameScoreTrendChart({ data }: GameScoreTrendChartProps) {
	const grouped = useMemo(() => {
		const map = new Map<string, GameScoreEntry[]>();
		for (const entry of data) {
			if (!map.has(entry.gameId)) map.set(entry.gameId, []);
			map.get(entry.gameId)?.push(entry);
		}
		return Array.from(map.entries()).map(([gameId, entries]) => ({
			gameId,
			gameName: entries[0]?.gameName ?? gameId,
			entries: entries.sort(
				(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
			),
		}));
	}, [data]);

	if (!data || data.length === 0) {
		return (
			<Card className="p-5">
				<h3 className="mb-4 font-medium text-on-surface">Game Score Trends</h3>
				<div className="flex h-64 items-center justify-center rounded-xl border border-surface-container-highest bg-surface-container-lowest">
					<p className="text-on-surface-variant text-sm">
						No game score data to display.
					</p>
				</div>
			</Card>
		);
	}

	return (
		<Card className="p-5">
			<h3 className="mb-4 font-medium text-on-surface">Game Score Trends</h3>
			<div className="space-y-6">
				{grouped.map(({ gameId, gameName, entries }) => {
					const chartData = entries.map((entry) => ({
						date: formatDate(new Date(entry.date)),
						fullDate: new Date(entry.date),
						score: entry.score,
						rawMetrics: entry.rawMetrics,
					}));

					return (
						<div key={gameId}>
							<h4 className="mb-2 font-medium text-on-surface-variant text-sm">
								{gameName}
							</h4>
							<div className="h-48 w-full">
								<ResponsiveContainer width="100%" height="100%">
									<LineChart data={chartData}>
										<XAxis
											dataKey="date"
											tick={{ fontSize: 11, fill: "currentColor" }}
											stroke="currentColor"
											className="text-on-surface-variant"
										/>
										<YAxis
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
											formatter={(value: number) => [`${value}`, "Score"]}
										/>
										<Line
											type="monotone"
											dataKey="score"
											stroke="var(--chart-1)"
											strokeWidth={2}
											dot={{ fill: "var(--chart-1)", r: 4 }}
											activeDot={{ r: 6 }}
										/>
									</LineChart>
								</ResponsiveContainer>
							</div>
						</div>
					);
				})}
			</div>
		</Card>
	);
}
