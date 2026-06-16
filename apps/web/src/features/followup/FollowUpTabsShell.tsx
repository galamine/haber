import { Button } from "@haber-final/ui/components/button";
import { Progress } from "@haber-final/ui/components/progress";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@haber-final/ui/components/tabs";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { FOLLOWUP_TABS, type FollowUpTabValue } from "./constants";

type FollowUpTabsShellProps = {
	activeTab: FollowUpTabValue;
	onTabChange: (value: FollowUpTabValue) => void;
	errorTabs?: Set<string>;
	sections: Record<FollowUpTabValue, ReactNode>;
	onSubmit?: () => void;
	isSubmitting?: boolean;
	readOnly?: boolean;
};

export function FollowUpTabsShell({
	activeTab,
	onTabChange,
	errorTabs = new Set(),
	sections,
	onSubmit,
	isSubmitting,
	readOnly = false,
}: FollowUpTabsShellProps) {
	const currentIdx = FOLLOWUP_TABS.findIndex((tab) => tab.value === activeTab);
	const progress = ((currentIdx + 1) / FOLLOWUP_TABS.length) * 100;
	const isLast = currentIdx === FOLLOWUP_TABS.length - 1;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-1.5">
				<Progress value={progress} />
				<p className="text-on-surface-variant text-xs">
					Section {currentIdx + 1} of {FOLLOWUP_TABS.length}
				</p>
			</div>

			<Tabs
				value={activeTab}
				onValueChange={(value) => onTabChange(value as FollowUpTabValue)}
			>
				<TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
					{FOLLOWUP_TABS.map((tab) => (
						<TabsTrigger
							key={tab.value}
							value={tab.value}
							className="relative border border-outline-variant data-[state=active]:bg-brown-100 data-[state=active]:text-brown-800"
						>
							{tab.label}
							{errorTabs.has(tab.value) && (
								<span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
							)}
						</TabsTrigger>
					))}
				</TabsList>

				{FOLLOWUP_TABS.map((tab) => (
					<TabsContent key={tab.value} value={tab.value} className="mt-4">
						{sections[tab.value]}
					</TabsContent>
				))}
			</Tabs>

			{!readOnly && (
				<div className="flex justify-between">
					<Button
						type="button"
						variant="outline"
						disabled={currentIdx === 0}
						onClick={() => onTabChange(FOLLOWUP_TABS[currentIdx - 1].value)}
						className="gap-2"
					>
						<ChevronLeft className="h-4 w-4" />
						Back
					</Button>

					{isLast ? (
						onSubmit && (
							<Button type="button" onClick={onSubmit} disabled={isSubmitting}>
								{isSubmitting ? "Submitting…" : "Submit Follow-Up"}
							</Button>
						)
					) : (
						<Button
							type="button"
							onClick={() => onTabChange(FOLLOWUP_TABS[currentIdx + 1].value)}
							className="gap-2"
						>
							Next
							<ChevronRight className="h-4 w-4" />
						</Button>
					)}
				</div>
			)}
		</div>
	);
}
