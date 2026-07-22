import { Check, ChevronRight } from "lucide-react";
import * as React from "react";

import { cn } from "../lib/utils";

export interface StepsProps extends React.HTMLAttributes<HTMLDivElement> {
	steps: string[];
	currentStep: number;
}

function Steps({ steps, currentStep, className, ...props }: StepsProps) {
	return (
		<div
			className={cn("mb-8 flex items-center justify-center", className)}
			{...props}
		>
			{steps.map((label, index) => {
				const stepNum = index + 1;
				const isActive = stepNum === currentStep;
				const isDone = stepNum < currentStep;

				return (
					<React.Fragment key={label}>
						<div className="flex flex-shrink-0 items-center gap-3">
							<div
								className={cn(
									"flex h-8 w-8 items-center justify-center rounded-full font-semibold text-sm transition-all",
									isActive || isDone
										? "bg-brown-700 text-white"
										: "bg-gray-300 text-gray-500",
								)}
							>
								{isDone ? <Check className="h-3 w-3" /> : stepNum}
							</div>
							<span
								className={cn(
									"whitespace-nowrap font-medium text-sm",
									isActive || isDone ? "text-foreground" : "text-gray-500",
								)}
							>
								{label}
							</span>
						</div>
						{index < steps.length - 1 && (
							<ChevronRight className="mx-4 h-4 w-4 text-brown-300" />
						)}
					</React.Fragment>
				);
			})}
		</div>
	);
}

export { Steps };
