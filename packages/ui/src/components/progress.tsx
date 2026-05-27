"use client";

import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import { cn } from "@habe-final/ui/lib/utils";

function Progress({
	className,
	value = 0,
	...props
}: ProgressPrimitive.Root.Props) {
	return (
		<ProgressPrimitive.Root
			data-slot="progress"
			value={value}
			className={cn(
				"relative h-1.5 w-full overflow-hidden rounded-none bg-secondary",
				className,
			)}
			{...props}
		>
			<ProgressPrimitive.Track
				data-slot="progress-track"
				className="h-full w-full rounded-none bg-secondary"
			>
				<ProgressPrimitive.Indicator
					data-slot="progress-indicator"
					className="h-full rounded-none bg-primary transition-all duration-300 ease-in-out"
					style={{ width: `${value ?? 0}%` }}
				/>
			</ProgressPrimitive.Track>
		</ProgressPrimitive.Root>
	);
}

export { Progress };
