"use client";

import { Toggle as ToggleItemPrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { toggleVariants } from "@habe-final/ui/components/toggle";
import { cn } from "@habe-final/ui/lib/utils";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";

type ToggleGroupContextValue = VariantProps<typeof toggleVariants>;

const ToggleGroupContext = React.createContext<ToggleGroupContextValue>({
	variant: "default",
	size: "default",
});

function ToggleGroup({
	className,
	variant = "default",
	size = "default",
	children,
	...props
}: ToggleGroupPrimitive.Props<string> & VariantProps<typeof toggleVariants>) {
	return (
		<ToggleGroupPrimitive
			data-slot="toggle-group"
			className={cn("flex items-center gap-1", className)}
			{...props}
		>
			<ToggleGroupContext.Provider value={{ variant, size }}>
				{children}
			</ToggleGroupContext.Provider>
		</ToggleGroupPrimitive>
	);
}

function ToggleGroupItem({
	className,
	variant,
	size,
	...props
}: ToggleItemPrimitive.Props & VariantProps<typeof toggleVariants>) {
	const context = React.useContext(ToggleGroupContext);
	return (
		<ToggleItemPrimitive
			data-slot="toggle-group-item"
			className={cn(
				toggleVariants({
					variant: variant ?? context.variant,
					size: size ?? context.size,
				}),
				"min-w-0 flex-1 shrink-0",
				className,
			)}
			{...props}
		/>
	);
}

export { ToggleGroup, ToggleGroupItem };
