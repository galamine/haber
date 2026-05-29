import type * as React from "react";

import { cn } from "../lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
	return (
		<textarea
			data-slot="textarea"
			className={cn(
				"field-sizing-content flex min-h-20 w-full resize-none rounded-lg border border-brown-300 bg-input-background px-3 py-3 text-base outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus:border-ring focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm dark:aria-invalid:ring-destructive/40",
				"hover:border-brown-400",
				className,
			)}
			{...props}
		/>
	);
}

export { Textarea };
