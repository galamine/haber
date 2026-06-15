import { cn } from "@haber-final/ui/lib/utils";
import type { ReactNode } from "react";

export function ReadOnlyField({
	label,
	value,
	className,
}: {
	label: string;
	value: ReactNode;
	className?: string;
}) {
	const isEmpty = value === null || value === undefined || value === "";

	return (
		<div className={cn(className)}>
			<dt className="font-medium text-on-surface-variant text-xs uppercase tracking-wider">
				{label}
			</dt>
			<dd className="mt-1 text-on-surface text-sm">
				{isEmpty ? <span className="text-outline">—</span> : value}
			</dd>
		</div>
	);
}
