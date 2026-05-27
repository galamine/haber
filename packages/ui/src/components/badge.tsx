import { cn } from "@habe-final/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

const badgeVariants = cva(
	"inline-flex items-center gap-1 rounded-none border border-transparent px-2 py-0.5 font-medium text-xs transition-colors [&_svg:not([class*='size-'])]:size-3 [&_svg]:pointer-events-none",
	{
		variants: {
			variant: {
				default: "bg-primary text-primary-foreground",
				secondary: "bg-secondary text-secondary-foreground",
				destructive: "bg-destructive/10 text-destructive",
				outline: "border border-border bg-transparent text-foreground",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

function Badge({
	className,
	variant = "default",
	...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
	return (
		<span
			data-slot="badge"
			className={cn(badgeVariants({ variant, className }))}
			{...props}
		/>
	);
}

export { Badge, badgeVariants };
