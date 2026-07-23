import { Check } from "lucide-react";
import * as React from "react";

import { cn } from "../lib/utils";

export interface LinearProgressStepsProps
	extends React.HTMLAttributes<HTMLDivElement> {
	steps: {
		label: string;
		icon?: React.ComponentType<{ className?: string }>;
	}[];
	currentStep: number;
	completedSteps?: Set<number>;
	showCompletedIcon?: boolean;
	onStepClick?: (step: number) => void;
}

function LinearProgressSteps({
	steps,
	currentStep,
	completedSteps = new Set(),
	showCompletedIcon = true,
	onStepClick,
	className,
	...props
}: LinearProgressStepsProps) {
	return (
		<div className={cn("flex flex-col gap-4", className)} {...props}>
			<div className="flex items-center justify-between">
				{steps.map((step, index) => {
					const stepNumber = index + 1;
					const isActive = stepNumber === currentStep;
					const isCompleted =
						completedSteps.has(stepNumber) || stepNumber < currentStep;
					const StepIcon = step.icon;

					return (
						<React.Fragment key={index}>
							<div className="flex flex-1 flex-col items-center">
								<button
									type="button"
									disabled={!onStepClick}
									onClick={
										onStepClick ? () => onStepClick(stepNumber) : undefined
									}
									onKeyDown={
										onStepClick
											? (e) => {
													if (e.key === "Enter" || e.key === " ") {
														onStepClick(stepNumber);
													}
												}
											: undefined
									}
									className={cn(
										"relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 transition-all disabled:cursor-default",
										isCompleted
											? "border-brown-700 bg-brown-700 text-white"
											: isActive
												? "border-brown-700 bg-brown-50 text-brown-700"
												: "border-brown-300 bg-white text-brown-400",
										onStepClick && "cursor-pointer",
									)}
								>
									{isCompleted && showCompletedIcon ? (
										<Check className="h-5 w-5" />
									) : StepIcon ? (
										<StepIcon className="h-5 w-5" />
									) : (
										stepNumber
									)}
								</button>

								<div className="mt-3 text-center">
									<div
										className={cn(
											"font-medium text-sm",
											isActive
												? "text-brown-700"
												: isCompleted
													? "text-brown-600"
													: "text-brown-400",
										)}
									>
										{step.label}
									</div>
								</div>
							</div>

							{index < steps.length - 1 && (
								<div className="flex flex-1 items-center">
									<div className="mx-2 h-0.5 flex-1 bg-brown-200">
										<div
											className={cn(
												"h-full bg-brown-700 transition-all duration-500",
												isCompleted ? "w-full" : "w-0",
											)}
										/>
									</div>
								</div>
							)}
						</React.Fragment>
					);
				})}
			</div>
		</div>
	);
}

export { LinearProgressSteps };
