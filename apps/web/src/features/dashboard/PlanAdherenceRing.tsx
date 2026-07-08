import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@haber-final/ui/components/card";
import {
	RadialBar,
	RadialBarChart,
	ResponsiveContainer,
	Tooltip,
} from "recharts";

type PlanAdherenceRingProps = {
	rate: number;
};

export function PlanAdherenceRing({ rate }: PlanAdherenceRingProps) {
	const chartData = [
		{ name: "Adherence", value: rate, fill: "var(--chart-1)" },
	];

	if (rate === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="font-medium text-on-surface">
						Plan Adherence
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex h-[200px] items-center justify-center">
						<p className="text-on-surface-variant text-sm">No data available</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="font-medium text-on-surface">
					Plan Adherence
				</CardTitle>
			</CardHeader>
			<CardContent>
				<ResponsiveContainer width="100%" height={200}>
					<RadialBarChart
						cx="50%"
						cy="50%"
						innerRadius="60%"
						outerRadius="90%"
						data={chartData}
					>
						<RadialBar
							dataKey="value"
							cornerRadius={10}
							background={{ fill: "var(--chart-1)", opacity: 0.2 }}
						/>
						<Tooltip
							contentStyle={{
								backgroundColor: "var(--color-bg-primary)",
								border: "1px solid var(--color-border-primary)",
								borderRadius: "var(--radius)",
								fontSize: "12px",
							}}
							formatter={(value: number) => [
								`${value.toFixed(1)}%`,
								"Adherence",
							]}
						/>
					</RadialBarChart>
				</ResponsiveContainer>
				<p className="mt-2 text-center text-on-surface-variant text-xs">
					{rate.toFixed(1)}% of sessions completed this week
				</p>
			</CardContent>
		</Card>
	);
}
