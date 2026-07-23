import { Tabs, TabsList, TabsTrigger } from "@haber-final/ui/components/tabs";
import { cn } from "@haber-final/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export interface TabItem {
	value: string;
	label: string;
	icon: LucideIcon;
	count?: number;
}

interface IconTabsProps {
	tabs: TabItem[];
	defaultValue: string;
	className?: string;
	tabsListClassName?: string;
	onValueChange?: (value: string) => void;
	value?: string;
	children: ReactNode;
}

export function IconTabs({
	tabs,
	defaultValue,
	className,
	tabsListClassName,
	onValueChange,
	value,
	children,
}: IconTabsProps) {
	return (
		<Tabs
			defaultValue={defaultValue}
			value={value}
			onValueChange={onValueChange}
			className={cn("w-full", className)}
		>
			<TabsList
				className={cn(
					"inline-flex h-9 w-full items-center justify-center gap-1 rounded-xl bg-accent p-1",
					tabsListClassName,
				)}
			>
				{tabs.map((tab) => (
					<TabsTrigger
						key={tab.value}
						value={tab.value}
						className="flex items-center gap-2"
					>
						<tab.icon className="h-4 w-4" />
						{tab.label}
						{tab.count !== undefined && (
							<span className="ml-1">({tab.count})</span>
						)}
					</TabsTrigger>
				))}
			</TabsList>
			{children}
		</Tabs>
	);
}
