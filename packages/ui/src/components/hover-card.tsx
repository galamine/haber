"use client";

import { PreviewCard as HoverCardPrimitive } from "@base-ui/react/preview-card";
import { cn } from "@habe-final/ui/lib/utils";

function HoverCard({ ...props }: HoverCardPrimitive.Root.Props) {
	return <HoverCardPrimitive.Root data-slot="hover-card" {...props} />;
}

function HoverCardTrigger({ ...props }: HoverCardPrimitive.Trigger.Props) {
	return (
		<HoverCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />
	);
}

function HoverCardContent({
	className,
	align = "center",
	side = "bottom",
	sideOffset = 4,
	...props
}: HoverCardPrimitive.Popup.Props &
	Pick<HoverCardPrimitive.Positioner.Props, "align" | "side" | "sideOffset">) {
	return (
		<HoverCardPrimitive.Portal>
			<HoverCardPrimitive.Positioner
				side={side}
				align={align}
				sideOffset={sideOffset}
				className="isolate z-50 outline-none"
			>
				<HoverCardPrimitive.Popup
					data-slot="hover-card-content"
					className={cn(
						"data-open:fade-in-0 data-open:zoom-in-95 data-closed:fade-out-0 data-closed:zoom-out-95 w-64 origin-(--transform-origin) rounded-none bg-popover p-4 text-popover-foreground shadow-md outline-none ring-1 ring-foreground/10 duration-150 data-closed:animate-out data-open:animate-in",
						className,
					)}
					{...props}
				/>
			</HoverCardPrimitive.Positioner>
		</HoverCardPrimitive.Portal>
	);
}

export { HoverCard, HoverCardContent, HoverCardTrigger };
