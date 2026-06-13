import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { CheckIcon, Minus } from "lucide-react";
import type * as React from "react";

import { cn } from "../lib/utils";

function Checkbox({
	className,
	checked,
	...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
	const isIndeterminate = checked === "indeterminate";

	return (
		<CheckboxPrimitive.Root
			data-slot="checkbox"
			className={cn(
				"peer size-4 shrink-0 rounded-[4px] border border bg-input-background shadow-xs outline-none transition-shadow focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=checked]:border-primary data-[state=indeterminate]:border-primary data-[state=checked]:bg-primary data-[state=indeterminate]:bg-primary data-[state=checked]:text-primary-foreground data-[state=indeterminate]:text-primary-foreground dark:bg-input/30 dark:data-[state=checked]:bg-primary dark:aria-invalid:ring-destructive/40",
				className,
			)}
			checked={checked}
			{...props}
		>
			<CheckboxPrimitive.Indicator
				data-slot="checkbox-indicator"
				className="flex items-center justify-center text-current transition-none"
			>
				{isIndeterminate ? (
					<Minus className="size-3.5" />
				) : (
					<CheckIcon className="size-3.5" />
				)}
			</CheckboxPrimitive.Indicator>
		</CheckboxPrimitive.Root>
	);
}

export { Checkbox };
