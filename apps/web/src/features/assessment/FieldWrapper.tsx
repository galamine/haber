import { Label } from "@haber-final/ui/components/label";
import { cn } from "@haber-final/ui/lib/utils";
import type { ReactNode } from "react";

export function FieldWrapper({
	label,
	htmlFor,
	required,
	error,
	hint,
	className,
	children,
}: {
	label: string;
	htmlFor?: string;
	required?: boolean;
	error?: string;
	hint?: string;
	className?: string;
	children: ReactNode;
}) {
	return (
		<div className={cn("flex flex-col gap-1.5", className)}>
			<Label htmlFor={htmlFor}>
				{label} {required && <span className="text-red-500">*</span>}
			</Label>
			{children}
			{error ? (
				<p className="text-red-600 text-xs">{error}</p>
			) : hint ? (
				<p className="text-on-surface-variant text-xs">{hint}</p>
			) : null}
		</div>
	);
}
