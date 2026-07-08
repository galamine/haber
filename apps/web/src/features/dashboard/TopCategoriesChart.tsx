import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@haber-final/ui/components/card";
import {
	Bar,
	BarChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

type Category = {
	categoryId: string;
	name: string;
	sessionCount: number;
};

type TopCategoriesChartProps = {
	categories: Category[];
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

export function TopCategoriesChart({ categories }: TopCategoriesChartProps) {
	if (!categories || categories.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="font-medium text-on-surface">
						Top Categories
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

	const chartData = categories.slice(0, 7).map((cat) => ({
		name: cat.name,
		sessionCount: cat.sessionCount,
	}));

	return (
		<Card>
			<CardHeader>
				<CardTitle className="font-medium text-on-surface">
					Top Categories
				</CardTitle>
			</CardHeader>
			<CardContent>
				<ResponsiveContainer width="100%" height={200}>
					<BarChart data={chartData}>
						<XAxis
							dataKey="name"
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
							formatter={(value: number) => [value, "Sessions"]}
						/>
						<Bar
							dataKey="sessionCount"
							fill={CHART_COLORS[0]}
							radius={[4, 4, 0, 0]}
						/>
					</BarChart>
				</ResponsiveContainer>
			</CardContent>
		</Card>
	);
}
