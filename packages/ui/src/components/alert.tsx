import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "../lib/utils";

const alertVariants = cva(
	"relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-lg border px-4 py-3 text-sm has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
	{
		variants: {
			variant: {
				default: "border-brown-200 bg-card text-card-foreground",
				destructive:
					"border-red-200 bg-red-50 text-red-900 *:data-[slot=alert-description]:text-red-800 [&>svg]:text-red-600",
				warning:
					"border-yellow-200 bg-yellow-50 text-yellow-900 *:data-[slot=alert-description]:text-yellow-800 [&>svg]:text-yellow-600",
				info: "border-blue-200 bg-blue-50 text-blue-900 *:data-[slot=alert-description]:text-blue-800 [&>svg]:text-blue-600",
				success:
					"border-green-200 bg-green-50 text-green-900 *:data-[slot=alert-description]:text-green-800 [&>svg]:text-green-600",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

function Alert({
	className,
	variant,
	...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
	return (
		<div
			data-slot="alert"
			role="alert"
			className={cn(alertVariants({ variant }), className)}
			{...props}
		/>
	);
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="alert-title"
			className={cn(
				"col-start-2 line-clamp-1 min-h-4 font-semibold text-sm leading-5 tracking-tight",
				className,
			)}
			{...props}
		/>
	);
}

function AlertDescription({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="alert-description"
			className={cn(
				"col-start-2 mt-1 grid justify-items-start gap-1 text-sm leading-relaxed opacity-90",
				className,
			)}
			{...props}
		/>
	);
}

export { Alert, AlertDescription, AlertTitle };
