export function DeltaBadge({ delta }: { delta: number }) {
	if (delta < 0)
		return (
			<span className="rounded border border-green-200 bg-green-50 px-2 py-0.5 font-medium text-green-600 text-xs">
				Improved ({delta})
			</span>
		);
	if (delta > 0)
		return (
			<span className="rounded border border-red-200 bg-red-50 px-2 py-0.5 font-medium text-red-600 text-xs">
				Increased (+{delta})
			</span>
		);
	return (
		<span className="rounded bg-surface-variant px-2 py-0.5 text-muted-foreground text-xs">
			Unchanged (0)
		</span>
	);
}
