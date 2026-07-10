import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@haber-final/ui/components/card";
import type { LucideIcon } from "lucide-react";

type StatCardProps = {
	title: string;
	value: string | number;
	subtitle?: string;
	icon?: LucideIcon;
	children?: React.ReactNode;
};

export function StatCard({
	title,
	value,
	subtitle,
	icon: Icon,
	children,
}: StatCardProps) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between pb-2">
				<CardTitle className="font-medium text-on-surface-variant text-sm">
					{title}
				</CardTitle>
				{Icon && <Icon className="h-4 w-4 text-on-surface-variant" />}
			</CardHeader>
			<CardContent>
				<div className="font-semibold text-2xl text-on-surface">{value}</div>
				{subtitle && (
					<p className="text-on-surface-variant text-xs">{subtitle}</p>
				)}
				{children}
			</CardContent>
		</Card>
	);
}
