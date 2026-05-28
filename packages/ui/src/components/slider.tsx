"use client";

import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { cn } from "@haber-final/ui/lib/utils";

function Slider({
	className,
	defaultValue,
	value,
	min = 0,
	max = 100,
	...props
}: SliderPrimitive.Root.Props) {
	return (
		<SliderPrimitive.Root
			data-slot="slider"
			defaultValue={defaultValue}
			value={value}
			min={min}
			max={max}
			className={cn(
				"relative flex w-full touch-none select-none items-center data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col data-[disabled]:opacity-50",
				className,
			)}
			{...props}
		>
			<SliderPrimitive.Control
				data-slot="slider-control"
				className="flex w-full items-center data-[orientation=vertical]:h-full data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col"
			>
				<SliderPrimitive.Track
					data-slot="slider-track"
					className="relative h-1.5 w-full grow overflow-hidden rounded-none bg-secondary data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5"
				>
					<SliderPrimitive.Indicator
						data-slot="slider-indicator"
						className="absolute h-full rounded-none bg-primary data-[orientation=vertical]:w-full"
					/>
				</SliderPrimitive.Track>
				<SliderPrimitive.Thumb
					data-slot="slider-thumb"
					className="block size-4 shrink-0 rounded-full border border-primary bg-background shadow-sm transition-shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
				/>
			</SliderPrimitive.Control>
		</SliderPrimitive.Root>
	);
}

export { Slider };
