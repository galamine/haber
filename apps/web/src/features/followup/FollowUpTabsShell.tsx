import { Button } from "@haber-final/ui/components/button";
import { LinearProgressSteps } from "@haber-final/ui/components/linear-progress-steps";
import { Progress } from "@haber-final/ui/components/progress";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo } from "react";

import { FOLLOWUP_TABS, type FollowUpTabValue } from "./constants";

type FollowUpTabsShellProps = {
	activeTab: FollowUpTabValue;
	onTabChange: (value: FollowUpTabValue) => void;
	errorTabs?: Set<string>;
	sections: Record<FollowUpTabValue, ReactNode>;
	onSubmit?: () => void;
	isSubmitting?: boolean;
	mode?: "edit" | "view";
};

export function FollowUpTabsShell({
	activeTab,
	onTabChange,
	errorTabs = new Set(),
	sections,
	onSubmit,
	isSubmitting,
	mode = "edit",
}: FollowUpTabsShellProps) {
	const currentIdx = FOLLOWUP_TABS.findIndex((tab) => tab.value === activeTab);
	const progress = ((currentIdx + 1) / FOLLOWUP_TABS.length) * 100;
	const isLast = currentIdx === FOLLOWUP_TABS.length - 1;
	const isViewMode = mode === "view";

	const completedSteps = useMemo(() => {
		if (isViewMode) {
			return new Set(
				Array.from({ length: FOLLOWUP_TABS.length }, (_, i) => i + 1),
			);
		}
		return new Set(
			Array.from(errorTabs)
				.map((v) => FOLLOWUP_TABS.findIndex((tab) => tab.value === v))
				.filter((idx) => idx < currentIdx)
				.map((idx) => idx + 1),
		);
	}, [errorTabs, currentIdx, isViewMode]);

	useEffect(() => {
		window.scrollTo({ top: 0, behavior: "smooth" });
	}, [activeTab]);

	const steps = useMemo(
		() =>
			FOLLOWUP_TABS.map((tab) => ({
				label: tab.label,
				icon: tab.icon,
			})),
		[],
	);

	const handleStepClick = (stepNumber: number) => {
		if (isViewMode) {
			onTabChange(FOLLOWUP_TABS[stepNumber - 1].value);
		}
	};

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-1.5">
				<Progress value={progress} />
				<p className="text-on-surface-variant text-xs">
					Section {currentIdx + 1} of {FOLLOWUP_TABS.length}
				</p>
			</div>

			<LinearProgressSteps
				steps={steps}
				currentStep={currentIdx + 1}
				completedSteps={completedSteps}
				showCompletedIcon={!isViewMode}
				onStepClick={isViewMode ? handleStepClick : undefined}
			/>

			<div className="mt-4">{sections[activeTab]}</div>

			<div className="flex justify-between">
				<Button
					type="button"
					variant="outline"
					disabled={currentIdx === 0}
					onClick={() => onTabChange(FOLLOWUP_TABS[currentIdx - 1].value)}
					className="gap-2"
				>
					<ChevronLeft className="h-4 w-4" />
					{isViewMode ? "Previous Section" : "Back"}
				</Button>

				{isViewMode ? (
					!isLast && (
						<Button
							type="button"
							onClick={() => onTabChange(FOLLOWUP_TABS[currentIdx + 1].value)}
							className="gap-2"
						>
							Next Section
							<ChevronRight className="h-4 w-4" />
						</Button>
					)
				) : isLast ? (
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
		</div>
	);
}
